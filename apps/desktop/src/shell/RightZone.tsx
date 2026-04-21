import type { FC, ReactNode } from 'react';
import { LcarsEmptyState, LcarsPill, LcarsZoneHeader } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import styles from './RightZone.module.css';

export interface RightZoneProps {
  /** Collapsed state — when true, pane is hidden by AppShell grid. */
  collapsed?: boolean;
  /** Called when the header toggle pill is clicked. */
  onToggle?: () => void;
  /** Title shown in the zone header. Defaults to "INSPECTOR". */
  title?: string;
  /** Optional content — when omitted, an empty state is rendered. */
  children?: ReactNode;
}

/**
 * RightZone — auxiliary surface for tool-contextual inspectors, diffs, or metadata.
 * Phase 2 renders a placeholder empty state. Phase 3+ will dock tool-specific panels.
 */
export const RightZone: FC<RightZoneProps> = ({
  collapsed = false,
  onToggle,
  title = 'INSPECTOR',
  children,
}) => {
  const { theme } = useTheme();

  return (
    <aside
      className={`${styles.zone} ${collapsed ? styles.zoneCollapsed : ''}`}
      aria-label="Inspector zone"
      aria-hidden={collapsed || undefined}
    >
      <LcarsZoneHeader
        eyebrow="RGT-00"
        title={title}
        indicatorColor={theme.colors.bluey}
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

      <div className={styles.body}>
        {children ?? (
          <LcarsEmptyState
            eyebrow="RGT-00"
            title="No inspector panel"
            description="Tools will dock context, diffs, and metadata here once opened."
            icon={<span aria-hidden>◇</span>}
          />
        )}
      </div>
    </aside>
  );
};
