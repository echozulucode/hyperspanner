import type { FC } from 'react';
import { LcarsEmptyState, LcarsPill, LcarsZoneHeader } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import type { OpenTool } from '../state';
import { useWorkspaceStore } from '../state';
import { getTool } from '../tools';
import { ZoneTabStrip } from './ZoneTabStrip';
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
 * Phase 3 wiring:
 *   - tab strip for tools docked to this zone (typically 0-2)
 *   - empty-state when nothing is docked
 *   - the active tool's registered component is rendered in the body
 */
export const RightZone: FC<RightZoneProps> = ({
  collapsed = false,
  onToggle,
  tools,
  activeTabId,
  title,
}) => {
  const { theme } = useTheme();
  const activeTool = tools.find((t) => t.id === activeTabId) ?? null;
  const activeDescriptor = activeTool ? getTool(activeTool.id) : null;
  const computedTitle = title ?? activeDescriptor?.name?.toUpperCase() ?? 'INSPECTOR';
  const moveTool = useWorkspaceStore((s) => s.moveTool);

  return (
    <aside
      className={`${styles.zone} ${collapsed ? styles.zoneCollapsed : ''}`}
      aria-label="Inspector zone"
      aria-hidden={collapsed || undefined}
    >
      <LcarsZoneHeader
        eyebrow="RGT-00"
        title={computedTitle}
        indicatorColor={tools.length > 0 ? theme.colors.bluey : undefined}
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

      <ZoneTabStrip zone="right" tools={tools} activeId={activeTabId} />

      <div
        className={`${styles.body} ${tools.length === 0 ? styles.bodyEmpty : ''} ${styles.dropHost}`}
      >
        {tools.length === 0 || !activeTool || !activeDescriptor ? (
          <LcarsEmptyState
            eyebrow="RGT-00"
            title="No inspector panel"
            description="Tools will dock context, diffs, and metadata here once opened."
            icon={<span aria-hidden>◇</span>}
          />
        ) : (
          (() => {
            const ToolBody = activeDescriptor.component;
            return <ToolBody toolId={activeTool.id} />;
          })()
        )}
        <PaneDropTarget
          variant="zone-only"
          label="INSPECTOR"
          onDrop={(_region, toolId) => moveTool(toolId, 'right')}
        />
      </div>
    </aside>
  );
};
