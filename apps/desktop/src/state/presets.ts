import type { CenterSplit, WorkspaceState, Zone, ZoneCollapseState } from './workspace.types';

/**
 * Layout presets — named workspace configurations per plan-001 §"Layout presets".
 *
 * Each preset returns a partial state that `applyPreset` merges onto the current
 * store. Presets do NOT open tools in Phase 3 — that's Phase 6 when real tools
 * exist. They only configure zone visibility + center split.
 *
 * Phase 7 adds persistence for user-defined presets alongside these built-ins.
 */

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  apply: () => Partial<WorkspaceState>;
}

export const DEFAULT_COLLAPSED: ZoneCollapseState = {
  left: false,
  right: false,
  bottom: true,
};

function presetState(
  collapsed: Partial<ZoneCollapseState>,
  centerSplit: CenterSplit = 'none',
): Partial<WorkspaceState> {
  return {
    collapsed: { ...DEFAULT_COLLAPSED, ...collapsed },
    centerSplit,
  };
}

export const LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Left + Right open, Bottom tucked away, single center pane.',
    apply: () => presetState({}),
  },
  'text-ops': {
    id: 'text-ops',
    name: 'Text Ops',
    description: 'Full-width center, Right closed, Bottom open for diffs.',
    apply: () =>
      presetState({ right: true, bottom: false }, 'none'),
  },
  validation: {
    id: 'validation',
    name: 'Validation',
    description: 'Right for rules, Bottom for error lists.',
    apply: () =>
      presetState({ right: false, bottom: false }, 'none'),
  },
  'binary-inspection': {
    id: 'binary-inspection',
    name: 'Binary Inspection',
    description: 'Center split vertically; Right for bit layout; Bottom for history.',
    apply: () =>
      presetState({ right: false, bottom: false }, 'vertical'),
  },
  'minimal-focus': {
    id: 'minimal-focus',
    name: 'Minimal Focus',
    description: 'Everything collapsed except Center. Distraction-free.',
    apply: () =>
      presetState({ left: true, right: true, bottom: true }, 'none'),
  },
  diagnostics: {
    id: 'diagnostics',
    name: 'Diagnostics',
    description: 'Bottom open large; Right closed.',
    apply: () =>
      presetState({ right: true, bottom: false }, 'none'),
  },
};

export function findPreset(id: string): LayoutPreset | undefined {
  return LAYOUT_PRESETS[id];
}

/** The default "empty" workspace — no tools open, default collapse state. */
export const DEFAULT_WORKSPACE: Pick<
  WorkspaceState,
  'open' | 'activeByZone' | 'centerSplit' | 'collapsed' | 'layoutPreset' | 'pulseCounter'
> = {
  open: [],
  activeByZone: { center: null, right: null, bottom: null } as Record<Zone, string | null>,
  centerSplit: 'none',
  collapsed: { ...DEFAULT_COLLAPSED },
  layoutPreset: 'default',
  pulseCounter: 0,
};
