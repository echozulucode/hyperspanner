import type { FC } from 'react';
import { LcarsEmptyState, LcarsPill, LcarsZoneHeader } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import type { OpenTool } from '../state';
import { useWorkspaceStore } from '../state';
import { getTool, toolAcceptsZone } from '../tools';
import { PaneDropTarget } from './PaneDropTarget';
import styles from './RightZone.module.css';

export interface RightZoneProps {
  collapsed?: boolean;
  onToggle?: () => void;
  /** Tools currently docked in the right zone. */
  tools: OpenTool[];
  activeTabId: string | null;
  title?: string;
}

/**
 * RightZone — auxiliary surface for tool-contextual inspectors, diffs, or metadata.
 *
 * Single-tool dock (UX-3, 2026-04-24): the inspector holds at most one
 * tool, so there's no tab strip. Dragging a new tool into the inspector
 * goes through `moveTool`, which evicts whatever was there (state and
 * all). Closing the lone tool happens via the × control on the right of
 * the zone header — without tabs, the per-tab action menu isn't a path
 * anymore.
 *
 * Wiring:
 *   - empty-state when nothing is docked
 *   - the docked tool's registered component is rendered in the body
 *   - drop target overlays the body to accept new tools
 */
export const RightZone: FC<RightZoneProps> = ({
  collapsed = false,
  onToggle,
  tools,
  activeTabId,
  title,
}) => {
  const { theme } = useTheme();
  // Single-tool dock: prefer the activeTabId match if present, but fall
  // back to whatever happens to be in `tools` so a transient race after
  // an eviction can't briefly render the empty state when a real tool
  // is in the zone.
  const activeTool =
    tools.find((t) => t.id === activeTabId) ?? tools[0] ?? null;
  const activeDescriptor = activeTool ? getTool(activeTool.id) : null;
  // The inspector header is fixed at "INSPECTOR". The active tool's name
  // is surfaced via a tooltip (hover the title text) instead — without
  // tabs in this zone, that's the only way to identify what's docked.
  const computedTitle = title ?? 'INSPECTOR';
  const activeName = activeDescriptor?.name ?? activeTool?.id;
  const moveTool = useWorkspaceStore((s) => s.moveTool);
  const closeTool = useWorkspaceStore((s) => s.closeTool);

  return (
    <aside
      className={`${styles.zone} ${collapsed ? styles.zoneCollapsed : ''}`}
      aria-label="Inspector zone"
      aria-hidden={collapsed || undefined}
    >
      {/*
        * Inspector header — kept deliberately spare:
        *   - No `eyebrow` ("RGT-00" was internal id chrome with no user
        *     value).
        *   - No `indicatorColor` blue dot (it had a `box-shadow` halo
        *     that nudged the band's effective height when present, and
        *     "is something docked" is already obvious from the title's
        *     hover tooltip + the body's content).
        * Result: the band height is now driven exclusively by the
        * LcarsPill in `controls` and stays at its natural ~40px
        * regardless of whether a tool is docked.
        */}
      <LcarsZoneHeader
        title={
          // Inline title so the close × can sit on the title's text baseline
          // instead of the `controls` slot — putting it in `controls` next
          // to the HIDE pill made the slot wider, which on some screens
          // forced the LcarsPill to wrap and grew the band's effective
          // height. Inline keeps the header at its natural pill height.
          // The wrapper carries a `title` attribute so hovering anywhere on
          // "INSPECTOR" surfaces the active tool's name as a tooltip.
          <span
            className={styles.headerTitle}
            title={activeName ? `Active tool: ${activeName}` : undefined}
          >
            {computedTitle}
            {activeTool ? (
              <button
                type="button"
                className={styles.dismissBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTool(activeTool.id);
                }}
                aria-label={`Close ${activeName}`}
                title={`Close ${activeName}`}
              >
                ×
              </button>
            ) : null}
          </span>
        }
        controls={
          <LcarsPill
            size="small"
            rounded="both"
            color={theme.colors.africanViolet}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand inspector' : 'Collapse inspector'}
          >
            {collapsed ? 'SHOW' : 'HIDE'}
          </LcarsPill>
        }
      />

      <div
        className={`${styles.body} ${tools.length === 0 ? styles.bodyEmpty : ''} ${styles.dropHost}`}
      >
        {!activeTool || !activeDescriptor ? (
          <LcarsEmptyState
            eyebrow="RGT-00"
            title="No inspector panel"
            description="Drag a tool here, or open one from the navigator. The inspector holds a single tool — dragging another in replaces it."
            icon={<span aria-hidden>◇</span>}
          />
        ) : (
          (() => {
            const ToolBody = activeDescriptor.component;
            return <ToolBody toolId={activeTool.id} zone="right" />;
          })()
        )}
        <PaneDropTarget
          variant="zone-only"
          label="INSPECTOR"
          onDrop={(_region, toolId) => {
            // moveTool is also called here; guard again in case a stale
            // drag bypassed the canAccept gate (e.g. no id-carrier MIME).
            if (!toolAcceptsZone(toolId, 'right')) return;
            moveTool(toolId, 'right');
          }}
          canAccept={(toolId) => toolAcceptsZone(toolId, 'right')}
        />
      </div>
    </aside>
  );
};
