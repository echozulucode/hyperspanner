/**
 * Workspace state shape — the typed contract the `workspace` store, the
 * shell zones, and tool components all code against.
 *
 * This file holds pure types only; the store implementation lives in
 * `workspace.ts`. Tests and alternate implementations (hand-rolled reducer,
 * tauri-side projections) should consume these types, not re-derive them.
 */

/** Docking zones. The Left navigator is chrome, not a workspace zone. */
export type Zone = 'center' | 'right' | 'bottom';

/** Center-zone split mode. `none` → one pane; `horizontal` → top/bottom; `vertical` → left/right. */
export type CenterSplit = 'none' | 'horizontal' | 'vertical';

/** Which side of a split a center-zone tool is pinned to. */
export type SplitSide = 'a' | 'b';

/** An open tool and where it's docked. */
export interface OpenTool {
  id: string;
  zone: Zone;
  /** Only meaningful when zone === 'center' AND centerSplit !== 'none'. */
  splitSide?: SplitSide;
  /** Monotonic id used to transiently signal a "focus pulse" on the tab. */
  pulseId?: number;
}

/** Per-zone collapse state. Center is never collapsed. */
export interface ZoneCollapseState {
  right: boolean;
  bottom: boolean;
  /** Left navigator — not a workspace zone, but tracked here for convenience. */
  left: boolean;
}

/** The zones that can be collapsed. Excludes center (which can't) but
 *  includes `left` (the navigator chrome, tracked on `collapsed` for
 *  convenience). Used on action signatures so TypeScript refuses a
 *  `toggleZone('center')` at the call site. */
export type CollapsibleZone = Exclude<Zone, 'center'> | 'left';

export interface WorkspaceState {
  open: OpenTool[];
  /** Active tool id per zone, or null if the zone is empty / collapsed. */
  activeByZone: Record<Zone, string | null>;
  centerSplit: CenterSplit;
  collapsed: ZoneCollapseState;
  layoutPreset: string;
  /** Opaque counter that ticks every time a pulse is dispatched. Consumers
   *  compare pulseId on OpenTool vs the last-rendered id to know when to animate. */
  pulseCounter: number;
}

export interface WorkspaceActions {
  /**
   * Open a tool. If already open, focuses it in-place and triggers a pulse.
   * @param id  tool id (stable across sessions, matches the tool registry key)
   * @param zone optional force-zone; defaults to the tool's default zone (caller-resolved)
   */
  openTool: (id: string, zone?: Zone) => void;
  /** Focus an already-open tool and trigger a pulse on its tab. */
  focusTool: (id: string) => void;
  /** Close the tool. If it was active in its zone, activates another tool in that zone. */
  closeTool: (id: string) => void;
  /** Move a tool to a different zone (or, when center, change its splitSide). */
  moveTool: (id: string, zone: Zone, splitSide?: SplitSide) => void;
  /** Enable or change the center split. Pre-existing center tools get `splitSide: 'a'`. */
  splitCenter: (direction: Exclude<CenterSplit, 'none'>) => void;
  /** Collapse the center split back to a single pane. Side B tools move to side A. */
  mergeCenter: () => void;
  /** Set the active tab of a zone without moving the tool. */
  setActive: (zone: Zone, id: string | null) => void;
  /** Toggle a collapsible zone. Center cannot be collapsed and is
   *  excluded from the type to force callers to pick a valid target. */
  toggleZone: (zone: CollapsibleZone) => void;
  setZoneCollapsed: (zone: CollapsibleZone, value: boolean) => void;
  /** Apply a named preset (mutates collapse state + split + optional open set). */
  applyPreset: (name: string) => void;
  /** Reset to the default workspace (no tools open, default collapse). */
  resetLayout: () => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;
