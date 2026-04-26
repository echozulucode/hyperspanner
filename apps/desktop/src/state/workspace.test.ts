// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearWorkspaceStorage, useWorkspaceStore } from './workspace';

/**
 * workspace store — unit tests covering Phase 3 deliverables + Phase 7
 * persistence:
 *
 *   - single-instance enforcement (openTool on an open id focuses + pulses)
 *   - close reassigns activeByZone
 *   - moveTool updates zone + activeByZone in both directions
 *   - splitCenter / mergeCenter demote-and-restore splitSide
 *   - toggleZone flips collapse
 *   - applyPreset applies a valid preset, ignores unknown names
 *   - resetLayout returns to default
 *   - localStorage round-trip writes and rehydrates the partial shape
 *
 * The test environment is jsdom (rather than node) only because the
 * persist middleware reaches for `localStorage`. We don't do any
 * DOM rendering in this file — getState/setState only.
 */

beforeEach(() => {
  // Wipe both the in-memory state and the persisted blob so each test
  // starts from `DEFAULT_WORKSPACE`. Without the localStorage clear,
  // a side effect from one test (e.g. opening a tool) would survive
  // as a rehydration source for the next.
  clearWorkspaceStorage();
});

function snapshot() {
  return useWorkspaceStore.getState();
}

describe('workspace.openTool', () => {
  it('opens a new tool in the specified zone and makes it active', () => {
    const { openTool } = snapshot();
    openTool('json-validator', 'center');
    const s = snapshot();
    expect(s.open).toHaveLength(1);
    expect(s.open[0]).toMatchObject({ id: 'json-validator', zone: 'center' });
    expect(s.activeByZone.center).toBe('json-validator');
    // Center is never collapsible; opening a tool there doesn't touch the
    // collapse map. Bottom starts collapsed by default (see DEFAULT_COLLAPSED).
    expect(s.collapsed.bottom).toBe(true);
  });

  it('defaults to the center zone when no zone is provided', () => {
    snapshot().openTool('text-diff');
    expect(snapshot().open[0].zone).toBe('center');
  });

  it('enforces single-instance: reopening focuses and triggers a pulse', () => {
    const { openTool } = snapshot();
    openTool('json-validator', 'center');
    const firstPulse = snapshot().open[0].pulseId;
    const firstCount = snapshot().pulseCounter;

    openTool('json-validator', 'center');
    const s = snapshot();
    expect(s.open).toHaveLength(1);
    expect(s.pulseCounter).toBeGreaterThan(firstCount);
    expect(s.open[0].pulseId).not.toBe(firstPulse);
  });

  it('single-instance focus ignores the second zone argument (keeps original zone)', () => {
    const { openTool } = snapshot();
    openTool('json-validator', 'center');
    openTool('json-validator', 'right');
    const s = snapshot();
    expect(s.open[0].zone).toBe('center');
    // Focus should be re-applied to the original zone.
    expect(s.activeByZone.center).toBe('json-validator');
  });

  it('assigns splitSide="a" when opening in a split center', () => {
    const { openTool, splitCenter } = snapshot();
    splitCenter('vertical');
    openTool('json-validator', 'center');
    expect(snapshot().open[0].splitSide).toBe('a');
  });
});

describe('workspace.closeTool', () => {
  it('removes the tool and clears its activeByZone entry', () => {
    const { openTool, closeTool } = snapshot();
    openTool('json-validator', 'center');
    closeTool('json-validator');
    const s = snapshot();
    expect(s.open).toHaveLength(0);
    expect(s.activeByZone.center).toBeNull();
  });

  it('falls back to another open tool in the same zone when closing the active one', () => {
    const { openTool, closeTool } = snapshot();
    openTool('json-validator', 'center');
    openTool('yaml-validator', 'center');
    expect(snapshot().activeByZone.center).toBe('yaml-validator');
    closeTool('yaml-validator');
    expect(snapshot().activeByZone.center).toBe('json-validator');
  });

  it('is a no-op when the tool is not open', () => {
    const before = snapshot();
    before.closeTool('missing');
    const after = snapshot();
    expect(after.open).toEqual(before.open);
  });
});

describe('workspace.moveTool', () => {
  it('moves a tool between zones and updates activeByZone in both', () => {
    const { openTool, moveTool } = snapshot();
    openTool('json-validator', 'center');
    openTool('yaml-validator', 'center');
    // Active in center is yaml-validator.
    moveTool('yaml-validator', 'right');
    const s = snapshot();
    const moved = s.open.find((t) => t.id === 'yaml-validator');
    expect(moved?.zone).toBe('right');
    expect(s.activeByZone.center).toBe('json-validator');
    expect(s.activeByZone.right).toBe('yaml-validator');
    expect(s.collapsed.right).toBe(false);
  });

  it('assigns splitSide when moving into a split center', () => {
    const { openTool, splitCenter, moveTool } = snapshot();
    openTool('json-validator', 'right');
    splitCenter('horizontal');
    moveTool('json-validator', 'center', 'b');
    const moved = snapshot().open[0];
    expect(moved.zone).toBe('center');
    expect(moved.splitSide).toBe('b');
  });

  it('is a no-op when target zone + splitSide are unchanged', () => {
    const { openTool, moveTool } = snapshot();
    openTool('json-validator', 'center');
    const counter = snapshot().pulseCounter;
    moveTool('json-validator', 'center');
    expect(snapshot().pulseCounter).toBe(counter);
  });

  it('inspector (right zone) is single-tool — moving a new tool in evicts the old one', () => {
    const { openTool, moveTool } = snapshot();
    openTool('json-validator', 'right');
    expect(snapshot().open.filter((t) => t.zone === 'right')).toHaveLength(1);

    openTool('hash-workbench', 'center');
    moveTool('hash-workbench', 'right');
    const s = snapshot();
    const inRight = s.open.filter((t) => t.zone === 'right');
    expect(inRight).toHaveLength(1);
    expect(inRight[0].id).toBe('hash-workbench');
    // The evicted tool is gone entirely (not relocated to another zone).
    expect(s.open.find((t) => t.id === 'json-validator')).toBeUndefined();
    expect(s.activeByZone.right).toBe('hash-workbench');
  });

  it('inspector eviction also fires when openTool targets the right zone', () => {
    const { openTool } = snapshot();
    openTool('json-validator', 'right');
    openTool('yaml-validator', 'right');
    const s = snapshot();
    const inRight = s.open.filter((t) => t.zone === 'right');
    expect(inRight).toHaveLength(1);
    expect(inRight[0].id).toBe('yaml-validator');
    expect(s.open.find((t) => t.id === 'json-validator')).toBeUndefined();
  });

  it('moving a sole-tool-in-source-zone into the inspector leaves the source zone empty and active=null', () => {
    // The user-visible regression risk is "I dragged my one center tool
    // into the inspector and the center now thinks something is still
    // active." Verify the source side reconciles: no leftover tools, no
    // dangling activeByZone pointer.
    const { openTool, moveTool } = snapshot();
    openTool('json-validator', 'center');
    expect(snapshot().activeByZone.center).toBe('json-validator');
    moveTool('json-validator', 'right');
    const s = snapshot();
    expect(s.open.filter((t) => t.zone === 'center')).toHaveLength(0);
    expect(s.activeByZone.center).toBeNull();
    expect(s.activeByZone.right).toBe('json-validator');
    expect(s.open.filter((t) => t.zone === 'right')).toHaveLength(1);
  });

  it('moving the active center tool into the inspector promotes the next center tool to active', () => {
    // Multi-tool source case: the moved tool was active in center; after
    // the move the remaining center tool should become active.
    const { openTool, moveTool } = snapshot();
    openTool('json-validator', 'center');
    openTool('yaml-validator', 'center');
    expect(snapshot().activeByZone.center).toBe('yaml-validator');
    moveTool('yaml-validator', 'right');
    const s = snapshot();
    const inCenter = s.open.filter((t) => t.zone === 'center');
    expect(inCenter).toHaveLength(1);
    expect(inCenter[0].id).toBe('json-validator');
    expect(s.activeByZone.center).toBe('json-validator');
    expect(s.activeByZone.right).toBe('yaml-validator');
  });

  it('inspector eviction with a non-active source tool leaves the source active untouched', () => {
    // If the moved tool wasn't the active one, the source zone's active
    // pointer should NOT change. This guards against an off-by-one in the
    // activeByZone reconcile path.
    const { openTool, moveTool, setActive } = snapshot();
    openTool('json-validator', 'center');
    openTool('yaml-validator', 'center');
    setActive('center', 'json-validator'); // active is now json
    moveTool('yaml-validator', 'right'); // move the non-active one
    const s = snapshot();
    expect(s.activeByZone.center).toBe('json-validator'); // unchanged
    expect(s.activeByZone.right).toBe('yaml-validator');
  });
});

describe('workspace.splitCenter / mergeCenter', () => {
  it('splitCenter assigns all current center tools to side a', () => {
    const { openTool, splitCenter } = snapshot();
    openTool('json-validator', 'center');
    openTool('yaml-validator', 'center');
    splitCenter('vertical');
    const centerTools = snapshot().open.filter((t) => t.zone === 'center');
    expect(centerTools.every((t) => t.splitSide === 'a')).toBe(true);
    expect(snapshot().centerSplit).toBe('vertical');
  });

  it('splitCenter is idempotent for the same direction', () => {
    const { splitCenter } = snapshot();
    splitCenter('vertical');
    splitCenter('vertical');
    expect(snapshot().centerSplit).toBe('vertical');
  });

  it('mergeCenter clears splitSide on center tools and resets centerSplit', () => {
    const { openTool, splitCenter, moveTool, mergeCenter } = snapshot();
    openTool('json-validator', 'center');
    splitCenter('horizontal');
    openTool('yaml-validator', 'center');
    moveTool('yaml-validator', 'center', 'b');
    mergeCenter();
    const s = snapshot();
    const centerTools = s.open.filter((t) => t.zone === 'center');
    expect(centerTools.every((t) => t.splitSide === undefined)).toBe(true);
    expect(s.centerSplit).toBe('none');
  });
});

describe('workspace.setActive / toggleZone', () => {
  it('setActive only accepts an id that is actually in the zone', () => {
    const { openTool, setActive } = snapshot();
    openTool('json-validator', 'center');
    setActive('right', 'json-validator'); // invalid — wrong zone
    expect(snapshot().activeByZone.right).toBeNull();
    setActive('center', 'json-validator');
    expect(snapshot().activeByZone.center).toBe('json-validator');
  });

  it('setActive accepts null to clear a zone', () => {
    const { openTool, setActive } = snapshot();
    openTool('json-validator', 'center');
    setActive('center', null);
    expect(snapshot().activeByZone.center).toBeNull();
  });

  it('toggleZone flips collapse state', () => {
    const { toggleZone } = snapshot();
    expect(snapshot().collapsed.right).toBe(false);
    toggleZone('right');
    expect(snapshot().collapsed.right).toBe(true);
    toggleZone('right');
    expect(snapshot().collapsed.right).toBe(false);
  });
});

describe('workspace.applyPreset / resetLayout', () => {
  it('applyPreset applies a known preset and sets layoutPreset', () => {
    const { applyPreset } = snapshot();
    applyPreset('minimal-focus');
    const s = snapshot();
    expect(s.layoutPreset).toBe('minimal-focus');
    expect(s.collapsed.left).toBe(true);
    expect(s.collapsed.right).toBe(true);
    expect(s.collapsed.bottom).toBe(true);
  });

  it('applyPreset is a no-op for unknown names', () => {
    const { applyPreset } = snapshot();
    const before = { ...snapshot() };
    applyPreset('does-not-exist');
    expect(snapshot().layoutPreset).toBe(before.layoutPreset);
  });

  it('applyPreset demotes side B to side A when leaving a split', () => {
    const { openTool, splitCenter, moveTool, applyPreset } = snapshot();
    openTool('json-validator', 'center');
    splitCenter('horizontal');
    openTool('yaml-validator', 'center');
    moveTool('yaml-validator', 'center', 'b');
    applyPreset('default'); // default: centerSplit='none'
    const s = snapshot();
    expect(s.centerSplit).toBe('none');
    const centerTools = s.open.filter((t) => t.zone === 'center');
    expect(centerTools.every((t) => t.splitSide === undefined)).toBe(true);
  });

  it('resetLayout returns to the default empty workspace', () => {
    const { openTool, splitCenter, resetLayout } = snapshot();
    openTool('json-validator', 'center');
    openTool('hash-workbench', 'right');
    splitCenter('vertical');
    resetLayout();
    const s = snapshot();
    expect(s.open).toHaveLength(0);
    expect(s.centerSplit).toBe('none');
    expect(s.activeByZone.center).toBeNull();
    expect(s.activeByZone.right).toBeNull();
    expect(s.activeByZone.bottom).toBeNull();
  });
});

describe('workspace persistence (Phase 7)', () => {
  const STORAGE_KEY = 'hyperspanner/workspace/v1';

  function readPersisted(): {
    state: {
      open: Array<{ id: string; zone: string; splitSide?: string }>;
      activeByZone: Record<string, string | null>;
      centerSplit: string;
      collapsed: Record<string, boolean>;
      layoutPreset: string;
    };
    version: number;
  } | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  it('writes a partial of the workspace state to localStorage on update', () => {
    const { openTool } = snapshot();
    openTool('json-validator', 'center');
    const persisted = readPersisted();
    expect(persisted).not.toBeNull();
    expect(persisted?.version).toBe(1);
    expect(persisted?.state.open).toHaveLength(1);
    expect(persisted?.state.open[0]).toMatchObject({
      id: 'json-validator',
      zone: 'center',
    });
    expect(persisted?.state.activeByZone.center).toBe('json-validator');
  });

  it('strips transient fields (pulseId, pulseCounter) from the persisted shape', () => {
    const { openTool } = snapshot();
    openTool('json-validator', 'center');
    const persisted = readPersisted();
    // Each persisted OpenTool should NOT carry pulseId — it's animation
    // state with no meaning across sessions.
    expect(persisted?.state.open[0]).not.toHaveProperty('pulseId');
    // The top-level pulseCounter should also be excluded.
    expect(persisted?.state).not.toHaveProperty('pulseCounter');
  });

  it('persists collapse state and centerSplit', () => {
    const { toggleZone, splitCenter } = snapshot();
    toggleZone('bottom'); // bottom default is collapsed=true → flips to false
    splitCenter('vertical');
    const persisted = readPersisted();
    expect(persisted?.state.collapsed.bottom).toBe(false);
    expect(persisted?.state.centerSplit).toBe('vertical');
  });

  it('persists the active layout preset id after applyPreset', () => {
    const { applyPreset } = snapshot();
    applyPreset('binary-inspection');
    const persisted = readPersisted();
    expect(persisted?.state.layoutPreset).toBe('binary-inspection');
  });

  it('clearWorkspaceStorage removes the localStorage entry', () => {
    const { openTool } = snapshot();
    openTool('json-validator', 'center');
    expect(readPersisted()).not.toBeNull();
    clearWorkspaceStorage();
    expect(readPersisted()).toBeNull();
  });
});
