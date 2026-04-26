import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CenterSplit,
  OpenTool,
  SplitSide,
  WorkspaceState,
  WorkspaceStore,
  Zone,
  ZoneCollapseState,
} from './workspace.types';
import { DEFAULT_WORKSPACE, findPreset } from './presets';
import { clearToolState } from './useTool';

/**
 * Workspace store — single source of truth for:
 *   - which tools are open and in which zones
 *   - which tool is active per zone
 *   - center split mode
 *   - zone collapse state (Left nav + Right + Bottom)
 *   - active layout preset id
 *
 * Design notes:
 * - Single-instance: `openTool(id)` is idempotent for an already-open tool —
 *   it switches focus and bumps `pulseCounter` so the relevant tab can animate.
 * - Closing the active tab of a zone auto-selects the next open tab in that
 *   zone, or null if none remain.
 * - `splitCenter` assigns existing center tools to side A; new tools opened
 *   while a split is active go to the zone's current active side (or 'a'
 *   if no active side was set).
 * - `mergeCenter` collapses side B → side A.
 *
 * Persistence (Phase 7): wrapped in Zustand's `persist` middleware backed
 * by `localStorage`. Layout state survives reloads + restarts. The
 * partialize fn below excludes transient pieces — `pulseCounter` is an
 * animation tick that has no meaning across sessions, and per-tool
 * `pulseId` is the same idea on the other axis. Plan-002 §Phase 7 calls
 * for a Tauri `app_data_dir` JSON file as the eventual storage; the
 * `storage` option is a single line and swaps without touching call
 * sites, so we'll move there once we need cross-window persistence.
 */

const STORAGE_KEY = 'hyperspanner/workspace/v1';

/**
 * Strip transient fields before serialization. We persist the user's
 * intent (which tools are open in which zones, what's collapsed, etc.)
 * but not the animation state.
 */
function partializeWorkspace(state: WorkspaceStore): Pick<
  WorkspaceState,
  'open' | 'activeByZone' | 'centerSplit' | 'collapsed' | 'layoutPreset'
> {
  return {
    open: state.open.map(({ id, zone, splitSide }) => ({ id, zone, splitSide })),
    activeByZone: state.activeByZone,
    centerSplit: state.centerSplit,
    collapsed: state.collapsed,
    layoutPreset: state.layoutPreset,
  };
}

function makePulse(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/** Return `prev` with `zone` marked uncollapsed, or `prev` unchanged if `zone`
 *  is `'center'` (center is never collapsible). Keeps the spread-with-computed-key
 *  pattern out of the call sites and prevents a stray `center: false` entry. */
function ensureUncollapsed(prev: ZoneCollapseState, zone: Zone): ZoneCollapseState {
  if (zone === 'center') return prev;
  return { ...prev, [zone]: false };
}

/** Resolve the next active tool for a zone after one of its tools left. */
function nextActiveForZone(open: OpenTool[], zone: Zone, removedId: string): string | null {
  const remaining = open.filter((t) => t.zone === zone && t.id !== removedId);
  if (remaining.length === 0) return null;
  return remaining[remaining.length - 1].id;
}

/** Ensure activeByZone entries reference tools that still exist + are in that zone. */
function reconcileActives(
  open: OpenTool[],
  prevActive: Record<Zone, string | null>,
): Record<Zone, string | null> {
  const result: Record<Zone, string | null> = { ...prevActive };
  (['center', 'right', 'bottom'] as Zone[]).forEach((zone) => {
    const current = result[zone];
    if (current === null) return;
    const stillThere = open.some((t) => t.id === current && t.zone === zone);
    if (!stillThere) {
      const fallback = open.filter((t) => t.zone === zone).pop();
      result[zone] = fallback?.id ?? null;
    }
  });
  return result;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_WORKSPACE,

      openTool: (id, zone) => {
        const state = get();
        const existing = state.open.find((t) => t.id === id);

        if (existing) {
          // Single-instance: focus the existing tool and pulse its tab.
          const pulseId = makePulse();
          set({
            open: state.open.map((t) => (t.id === id ? { ...t, pulseId } : t)),
            activeByZone: { ...state.activeByZone, [existing.zone]: id },
            pulseCounter: state.pulseCounter + 1,
            collapsed: ensureUncollapsed(state.collapsed, existing.zone),
          });
          return;
        }

        const targetZone: Zone = zone ?? 'center';
        const splitSide: SplitSide | undefined =
          targetZone === 'center' && state.centerSplit !== 'none' ? 'a' : undefined;

        // Inspector (right) holds a single tool — opening into it evicts
        // anything that's already there and clears its tool-state slot so
        // a re-open later starts fresh.
        let baseOpen = state.open;
        if (targetZone === 'right') {
          const evicted = state.open.filter((t) => t.zone === 'right');
          if (evicted.length > 0) {
            baseOpen = state.open.filter((t) => t.zone !== 'right');
            evicted.forEach((t) => clearToolState(t.id));
          }
        }

        const nextOpen: OpenTool[] = [
          ...baseOpen,
          { id, zone: targetZone, splitSide, pulseId: makePulse() },
        ];

        set({
          open: nextOpen,
          activeByZone: { ...state.activeByZone, [targetZone]: id },
          collapsed: ensureUncollapsed(state.collapsed, targetZone),
          pulseCounter: state.pulseCounter + 1,
        });
      },

      focusTool: (id) => {
        const state = get();
        const existing = state.open.find((t) => t.id === id);
        if (!existing) return;

        const pulseId = makePulse();
        set({
          open: state.open.map((t) => (t.id === id ? { ...t, pulseId } : t)),
          activeByZone: { ...state.activeByZone, [existing.zone]: id },
          collapsed: ensureUncollapsed(state.collapsed, existing.zone),
          pulseCounter: state.pulseCounter + 1,
        });
      },

      closeTool: (id) => {
        const state = get();
        const existing = state.open.find((t) => t.id === id);
        if (!existing) return;

        const nextOpen = state.open.filter((t) => t.id !== id);
        const activeByZone: Record<Zone, string | null> = { ...state.activeByZone };
        if (activeByZone[existing.zone] === id) {
          activeByZone[existing.zone] = nextActiveForZone(state.open, existing.zone, id);
        }

        set({ open: nextOpen, activeByZone });
        clearToolState(id);
      },

      moveTool: (id, zone, splitSide) => {
        const state = get();
        const existing = state.open.find((t) => t.id === id);
        if (!existing) return;
        if (existing.zone === zone && existing.splitSide === splitSide) return;

        // Inspector (right) holds a single tool. Moving a different tool in
        // evicts whatever already lives there. The eviction list excludes
        // the tool being moved (in case it's already in the inspector and
        // we're just changing its splitSide — though splitSide doesn't
        // apply outside the center split, this guard is defensive).
        let baseOpen = state.open;
        let evictedIds: string[] = [];
        if (zone === 'right') {
          evictedIds = state.open
            .filter((t) => t.zone === 'right' && t.id !== id)
            .map((t) => t.id);
          if (evictedIds.length > 0) {
            baseOpen = state.open.filter(
              (t) => !(t.zone === 'right' && t.id !== id),
            );
          }
        }

        const nextOpen = baseOpen.map((t) =>
          t.id === id
            ? {
                ...t,
                zone,
                splitSide:
                  zone === 'center' && state.centerSplit !== 'none'
                    ? (splitSide ?? t.splitSide ?? 'a')
                    : undefined,
                pulseId: makePulse(),
              }
            : t,
        );

        const activeByZone: Record<Zone, string | null> = { ...state.activeByZone };
        // Source zone may lose its active tool; destination zone adopts it.
        if (activeByZone[existing.zone] === id) {
          activeByZone[existing.zone] = nextActiveForZone(baseOpen, existing.zone, id);
        }
        activeByZone[zone] = id;

        set({
          open: nextOpen,
          activeByZone,
          collapsed: ensureUncollapsed(state.collapsed, zone),
          pulseCounter: state.pulseCounter + 1,
        });

        evictedIds.forEach((evictedId) => clearToolState(evictedId));
      },

      splitCenter: (direction) => {
        const state = get();
        if (state.centerSplit === direction) return;

        // Existing center tools all go to side 'a'. New tools opened after this
        // will default to side 'a' unless moved explicitly.
        const nextOpen = state.open.map((t) =>
          t.zone === 'center' ? { ...t, splitSide: 'a' as SplitSide } : t,
        );

        set({ open: nextOpen, centerSplit: direction });
      },

      mergeCenter: () => {
        const state = get();
        if (state.centerSplit === 'none') return;
        const nextOpen = state.open.map((t) =>
          t.zone === 'center' ? { ...t, splitSide: undefined } : t,
        );
        set({ open: nextOpen, centerSplit: 'none' });
      },

      setActive: (zone, id) => {
        const state = get();
        if (id !== null) {
          const valid = state.open.some((t) => t.id === id && t.zone === zone);
          if (!valid) return;
        }
        set({ activeByZone: { ...state.activeByZone, [zone]: id } });
      },

      toggleZone: (zone) => {
        const state = get();
        set({ collapsed: { ...state.collapsed, [zone]: !state.collapsed[zone] } });
      },

      setZoneCollapsed: (zone, value) => {
        const state = get();
        if (state.collapsed[zone] === value) return;
        set({ collapsed: { ...state.collapsed, [zone]: value } });
      },

      applyPreset: (name) => {
        const preset = findPreset(name);
        if (!preset) return;
        const patch = preset.apply();
        const prev = get();
        const nextCollapsed = patch.collapsed ?? prev.collapsed;
        const nextSplit: CenterSplit = patch.centerSplit ?? prev.centerSplit;

        // If we're leaving a split, demote side B tools to side A so they stay visible.
        const nextOpen =
          nextSplit === 'none' && prev.centerSplit !== 'none'
            ? prev.open.map((t) =>
                t.zone === 'center' ? { ...t, splitSide: undefined } : t,
              )
            : prev.open;

        set({
          ...prev,
          ...patch,
          open: nextOpen,
          collapsed: nextCollapsed,
          centerSplit: nextSplit,
          layoutPreset: name,
          activeByZone: reconcileActives(nextOpen, prev.activeByZone),
        });
      },

      resetLayout: () => {
        set({ ...DEFAULT_WORKSPACE });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: partializeWorkspace,
    },
  ),
);

/**
 * Test helper — clear persisted workspace state from storage AND reset
 * the in-memory store to defaults. Useful in `beforeEach` when a test
 * file exercises persistence behavior, since `setState({...DEFAULT})`
 * alone leaves the localStorage entry behind for the next file.
 *
 * Order matters: we reset the in-memory state FIRST, which causes the
 * persist middleware to synchronously write `DEFAULT_WORKSPACE` to
 * `localStorage`. Then we delete the storage entry so the final state
 * is "in-memory at defaults, storage empty." If we did it in the
 * opposite order, `setState` would re-create the entry we just deleted.
 */
export function clearWorkspaceStorage(): void {
  useWorkspaceStore.setState({ ...DEFAULT_WORKSPACE });
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Derived selector — open tools in a given zone, in insertion order.
 * Memoization handled by the consumer's useMemo; this is a pure filter.
 */
export function selectZoneTools(zone: Zone) {
  return (state: WorkspaceStore) => state.open.filter((t) => t.zone === zone);
}

export function selectActive(zone: Zone) {
  return (state: WorkspaceStore) => state.activeByZone[zone];
}
