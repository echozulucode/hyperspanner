import type { FC } from 'react';
import { LcarsEmptyState, LcarsPill, LcarsZoneHeader } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import type { OpenTool } from '../state';
import { useWorkspaceStore } from '../state';
import { getTool, toolAcceptsZone } from '../tools';
import { ZoneTabStrip } from './ZoneTabStrip';
import { PaneDropTarget } from './PaneDropTarget';
import styles from './BottomZone.module.css';

export interface BottomZoneProps {
  collapsed?: boolean;
  onToggle?: () => void;
  tools: OpenTool[];
  activeTabId: string | null;
  title?: string;
}

/**
 * BottomZone — telemetry / console / log surface.
 *
 * Phase 3 wiring:
 *   - tab strip for tools docked to this zone
 *   - empty-state when nothing is docked
 *   - the active tool's registered component renders in the body
 */
export const BottomZone: FC<BottomZoneProps> = ({
  collapsed = false,
  onToggle,
  tools,
  activeTabId,
  title,
}) => {
  const { theme } = useTheme();
  const activeTool = tools.find((t) => t.id === activeTabId) ?? null;
  const activeDescriptor = activeTool ? getTool(activeTool.id) : null;
  const computedTitle = title ?? activeDescriptor?.name?.toUpperCase() ?? 'CONSOLE';
  const moveTool = useWorkspaceStore((s) => s.moveTool);

  return (
    <section
      className={`${styles.zone} ${collapsed ? styles.zoneCollapsed : ''}`}
      aria-label="Console zone"
      aria-hidden={collapsed || undefined}
    >
      <LcarsZoneHeader
        eyebrow="BTM-00"
        title={computedTitle}
        indicatorColor={tools.length > 0 ? theme.colors.green : undefined}
        controls={
          <LcarsPill
            size="small"
            rounded="both"
            color={theme.colors.africanViolet}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand console' : 'Collapse console'}
          >
            {collapsed ? 'SHOW' : 'HIDE'}
          </LcarsPill>
        }
      />

      <ZoneTabStrip zone="bottom" tools={tools} activeId={activeTabId} />

      <div
        className={`${styles.body} ${tools.length === 0 ? styles.bodyEmpty : ''} ${styles.dropHost}`}
      >
        {tools.length === 0 || !activeTool || !activeDescriptor ? (
          <LcarsEmptyState
            eyebrow="BTM-00"
            title="No telemetry"
            description="Log output, task runs, and tool diagnostics will stream here."
            icon={<span aria-hidden>≋</span>}
          />
        ) : (
          (() => {
            const ToolBody = activeDescriptor.component;
            return <ToolBody toolId={activeTool.id} zone="bottom" />;
          })()
        )}
        <PaneDropTarget
          variant="zone-only"
          label="CONSOLE"
          onDrop={(_region, toolId) => {
            if (!toolAcceptsZone(toolId, 'bottom')) return;
            moveTool(toolId, 'bottom');
          }}
          canAccept={(toolId) => toolAcceptsZone(toolId, 'bottom')}
        />
      </div>
    </section>
  );
};
