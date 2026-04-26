import { useMemo } from 'react';
import type { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LcarsTelemetryLabel } from '@hyperspanner/lcars-ui';
import { useWorkspaceStore } from '../state';
import { useTheme } from '../contexts/ThemeContext';
import { getTool } from '../tools';
import styles from './ToolStatusPanels.module.css';

/**
 * ToolStatusPanels — low-key telemetry strips that render in the
 * LcarsStandardLayout's decorative chrome slots. Two exported variants:
 *
 *   - `TopRailStatus`   → stacked vertically for `topPanels` (the
 *                         decorative upper rail's children area). Reads
 *                         like a systems readout running down the rail.
 *   - `CascadeStatus`   → wraps horizontally for the `cascade` slot
 *                         (banner row, next to the nav pills). Reads
 *                         like the standard LCARS data-cascade column,
 *                         but with real key/value pairs instead of the
 *                         random-digit filler.
 *
 * Both variants read the same workspace state and resolve tool-specific
 * fields from the registry — so they always describe the CURRENT active
 * center tool, not a stale snapshot. Styling is intentionally subdued
 * (low opacity, small type) so the status doesn't compete with the
 * main content or the nav pills for attention.
 */

interface StatusFields {
  openCount: number;
  centerCount: number;
  rightCount: number;
  bottomCount: number;
  splitMode: string;
  activeToolName: string;
  activeToolCategory: string;
  activeToolZone: string;
}

function useStatusFields(): StatusFields {
  const { open, centerSplit, activeByZone } = useWorkspaceStore(
    useShallow((s) => ({
      open: s.open,
      centerSplit: s.centerSplit,
      activeByZone: s.activeByZone,
    })),
  );

  return useMemo(() => {
    const centerCount = open.filter((t) => t.zone === 'center').length;
    const rightCount = open.filter((t) => t.zone === 'right').length;
    const bottomCount = open.filter((t) => t.zone === 'bottom').length;

    // Prefer the center's active tool for the "active" line; fall back to
    // right, then bottom — whichever zone actually has focus. Most users
    // think of the center pane as "the tool" so this is the right default.
    const activeId =
      activeByZone.center ?? activeByZone.right ?? activeByZone.bottom ?? null;
    const descriptor = activeId ? getTool(activeId) : undefined;

    return {
      openCount: open.length,
      centerCount,
      rightCount,
      bottomCount,
      splitMode: centerSplit,
      activeToolName: descriptor?.name.toUpperCase() ?? 'NONE',
      activeToolCategory: descriptor?.category.toUpperCase() ?? '—',
      activeToolZone:
        activeId && activeByZone.center === activeId
          ? 'CENTER'
          : activeId && activeByZone.right === activeId
            ? 'RIGHT'
            : activeId && activeByZone.bottom === activeId
              ? 'BOTTOM'
              : '—',
    };
  }, [open, centerSplit, activeByZone]);
}

/**
 * Vertical readout for the LcarsStandardLayout `topPanels` slot. Sits on
 * the upper rail. Uses small LcarsTelemetryLabels with a subtle indicator
 * dot in the rail's own color so it reads as "this belongs to the rail"
 * rather than a floating widget.
 */
export const TopRailStatus: FC = () => {
  const { theme } = useTheme();
  const s = useStatusFields();
  return (
    <div className={styles.railStack} aria-label="Workspace status">
      <LcarsTelemetryLabel
        name="OPEN"
        value={String(s.openCount)}
        unit={s.openCount === 1 ? 'TOOL' : 'TOOLS'}
        size="small"
        indicatorColor={theme.colors.bluey}
        className={styles.railEntry}
      />
      <LcarsTelemetryLabel
        name="SPLIT"
        value={s.splitMode.toUpperCase()}
        size="small"
        indicatorColor={
          s.splitMode === 'none' ? theme.colors.almondCreme : theme.colors.butterscotch
        }
        className={styles.railEntry}
      />
    </div>
  );
};

/**
 * Horizontal readout for the LcarsStandardLayout `cascade` slot. Sits in
 * the banner row left of the nav pills. Tool-specific fields (active
 * tool name, category, zone) lead the cascade so a quick glance answers
 * "what am I looking at?" without reading the banner.
 */
export const CascadeStatus: FC = () => {
  const { theme } = useTheme();
  const s = useStatusFields();
  return (
    <div className={styles.cascade} aria-label="Active tool status">
      <LcarsTelemetryLabel
        name="ACTIVE"
        value={s.activeToolName}
        size="small"
        indicatorColor={s.activeToolName === 'NONE' ? undefined : theme.colors.orange}
        className={styles.cascadeEntry}
      />
      <LcarsTelemetryLabel
        name="CAT"
        value={s.activeToolCategory}
        size="small"
        className={styles.cascadeEntry}
      />
      <LcarsTelemetryLabel
        name="ZONE"
        value={s.activeToolZone}
        size="small"
        className={styles.cascadeEntry}
      />
      <LcarsTelemetryLabel
        name="C"
        value={String(s.centerCount)}
        size="small"
        indicatorColor={theme.colors.africanViolet}
        className={styles.cascadeEntry}
      />
      <LcarsTelemetryLabel
        name="R"
        value={String(s.rightCount)}
        size="small"
        indicatorColor={theme.colors.bluey}
        className={styles.cascadeEntry}
      />
      <LcarsTelemetryLabel
        name="B"
        value={String(s.bottomCount)}
        size="small"
        indicatorColor={theme.colors.butterscotch}
        className={styles.cascadeEntry}
      />
    </div>
  );
};
