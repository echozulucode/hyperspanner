import type { FC, ReactNode } from 'react';
import {
  LcarsEmptyState,
  LcarsPill,
  LcarsZoneHeader,
} from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import styles from './CenterZone.module.css';

export interface CenterTab {
  id: string;
  label: string;
  pulse?: boolean;
}

export type CenterSplit = 'none' | 'horizontal' | 'vertical';

export interface CenterZoneProps {
  tabs?: CenterTab[];
  activeTabId?: string | null;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
  split?: CenterSplit;
  onOpenSampleTool?: () => void;
  children?: ReactNode;
}

/**
 * CenterZone — primary work surface.
 * Phase 2 renders a tab strip and a placeholder empty state. The workspace store
 * (Phase 3) feeds the real tab list and active content via `children`.
 */
export const CenterZone: FC<CenterZoneProps> = ({
  tabs = [],
  activeTabId,
  onSelectTab,
  onCloseTab,
  split = 'none',
  onOpenSampleTool,
  children,
}) => {
  const { theme } = useTheme();
  const hasTabs = tabs.length > 0;

  const emptyState = (
    <LcarsEmptyState
      eyebrow="CENTER ZONE · CTR-00"
      title="No active tool"
      description="Open a tool from the navigator to begin. The command palette (⌘K) is the fastest path."
      icon={<span aria-hidden>◉</span>}
      action={
        <LcarsPill color={theme.colors.orange} onClick={onOpenSampleTool}>
          OPEN SAMPLE
        </LcarsPill>
      }
    />
  );

  const contentBody = (
    <div className={`${styles.content} ${hasTabs ? '' : styles.contentEmpty}`}>
      {hasTabs ? (
        children ?? emptyState
      ) : (
        emptyState
      )}
    </div>
  );

  return (
    <section className={styles.zone} aria-label="Center work surface">
      <LcarsZoneHeader
        eyebrow="CTR-00"
        title={
          hasTabs
            ? tabs.find((t) => t.id === activeTabId)?.label ?? 'SELECT A TAB'
            : 'WORK SURFACE'
        }
        indicatorColor={hasTabs ? theme.colors.green : undefined}
      />

      <div
        className={styles.tabStrip}
        role="tablist"
        aria-orientation="horizontal"
      >
        {hasTabs ? (
          tabs.map((tab) => (
            <LcarsPill
              key={tab.id}
              size="small"
              rounded="both"
              color={
                tab.id === activeTabId
                  ? theme.colors.orange
                  : theme.colors.africanViolet
              }
              active={tab.id === activeTabId}
              onClick={() => onSelectTab?.(tab.id)}
              aria-label={`${tab.label}${onCloseTab ? ' — middle-click to close' : ''}`}
            >
              {tab.label}
              {onCloseTab && tab.id === activeTabId && (
                <span
                  aria-hidden
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  style={{ marginLeft: '0.5rem', opacity: 0.6 }}
                >
                  ×
                </span>
              )}
            </LcarsPill>
          ))
        ) : (
          <span className={styles.tabStripEmpty}>TABS · 0</span>
        )}
      </div>

      {split === 'none' ? (
        contentBody
      ) : (
        <div
          className={`${styles.splitRoot} ${
            split === 'vertical' ? styles.splitVertical : styles.splitHorizontal
          }`}
        >
          <div className={styles.splitPane}>Pane A — Phase 3 wires splits</div>
          <div className={styles.splitPane}>Pane B</div>
        </div>
      )}
    </section>
  );
};
