import type { FC, ReactNode } from 'react';
import { LcarsEmptyState, LcarsPill, LcarsZoneHeader } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import styles from './BottomZone.module.css';

export interface BottomZoneProps {
  /** Collapsed state — when true, pane is hidden by AppShell grid. */
  collapsed?: boolean;
  /** Called when the header toggle pill is clicked. */
  onToggle?: () => void;
  /** Title shown in the zone header. Defaults to "CONSOLE". */
  title?: string;
  /** Optional content — when omitted, an empty state is rendered. */
  children?: ReactNode;
}

/**
 * BottomZone — telemetry / console / log surface.
 * Phase 2 renders a placeholder empty state. Phase 3+ will dock a shared log stream,
 * task runner output, and tool-specific telemetry.
 */
export const BottomZone: FC<BottomZoneProps> = ({
  collapsed = false,
  onToggle,
  title = 'CONSOLE',
  children,
}) => {
  const { theme } = useTheme();

  return (
    <section
      className={`${styles.zone} ${collapsed ? styles.zoneCollapsed : ''}`}
      aria-label="Console zone"
      aria-hidden={collapsed || undefined}
    >
      <LcarsZoneHeader
        eyebrow="BTM-00"
        title={title}
        indicatorColor={theme.colors.green}
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

      <div className={styles.body}>
        {children ?? (
          <LcarsEmptyState
            eyebrow="BTM-00"
            title="No telemetry"
            description="Log output, task runs, and tool diagnostics will stream here."
            icon={<span aria-hidden>≋</span>}
          />
        )}
      </div>
    </section>
  );
};
