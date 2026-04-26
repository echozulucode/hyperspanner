import type { WorkspaceState, Zone, ZoneCollapseState } from './workspace.types';

/**
 * Default workspace shape — the empty state the store initializes to and
 * the target `resetLayout()` returns to.
 *
 * Phase 7 originally also exposed a set of named layout presets here
 * (`LAYOUT_PRESETS` / `findPreset` / `applyPreset`), but the user
 * found preset switching unhelpful as a daily-use control: most users
 * adjust layout by hand, the named arrangements rarely matched what
 * they actually wanted, and surfacing presets as a top-rail dropdown
 * cluttered the chrome. The named-preset machinery has been removed
 * entirely; what survives is the default workspace shape that the
 * store and `resetLayout` both depend on.
 *
 * If we ever want preset-like behavior again, the cleanest revival is
 * a small `useCustomPresets` Zustand+persist slice modeled on
 * `useFavorites` — purely user-defined, no built-in catalog.
 */

export const DEFAULT_COLLAPSED: ZoneCollapseState = {
  left: false,
  right: false,
  bottom: true,
  top: false,
};

/** The default "empty" workspace — no tools open, default collapse state. */
export const DEFAULT_WORKSPACE: Pick<
  WorkspaceState,
  'open' | 'activeByZone' | 'centerSplit' | 'collapsed' | 'pulseCounter'
> = {
  open: [],
  activeByZone: { center: null, right: null, bottom: null } as Record<Zone, string | null>,
  centerSplit: 'none',
  collapsed: { ...DEFAULT_COLLAPSED },
  pulseCounter: 0,
};
