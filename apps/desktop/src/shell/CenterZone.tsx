import type { FC, ReactNode } from 'react';
import { LcarsEmptyState, LcarsPill, LcarsZoneHeader } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import type { CenterSplit, OpenTool } from '../state';
import { getTool } from '../tools';
import { ZoneTabStrip } from './ZoneTabStrip';
import styles from './CenterZone.module.css';

export interface CenterZoneProps {
  /** Tools currently docked in the center zone. */
  tools: OpenTool[];
  /** Active tab id for the center zone. */
  activeTabId: string | null;
  split: CenterSplit;
  onOpenSampleTool?: () => void;
}

/**
 * CenterZone — primary work surface.
 *
 * Phase 3 wiring:
 *   - tab strip fed by the workspace store (via props from AppShell)
 *   - split panes rendered when `split !== 'none'`, each with its own strip
 *     filtered to `splitSide: 'a' | 'b'`
 *   - empty-state when no tools are docked
 *   - active tool's registered component is rendered in the content area
 */
export const CenterZone: FC<CenterZoneProps> = ({
  tools,
  activeTabId,
  split,
  onOpenSampleTool,
}) => {
  const { theme } = useTheme();
  const activeTool = tools.find((t) => t.id === activeTabId) ?? null;
  const activeDescriptor = activeTool ? getTool(activeTool.id) : null;
  const hasTabs = tools.length > 0;

  const renderTool = (tool: OpenTool | null): ReactNode => {
    if (!tool) {
      return (
        <LcarsEmptyState
          eyebrow="CENTER · CTR-00"
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
    }
    const descriptor = getTool(tool.id);
    if (!descriptor) {
      return (
        <div className={styles.missing}>
          <p>Unknown tool: {tool.id}</p>
        </div>
      );
    }
    const ToolBody = descriptor.component;
    return <ToolBody toolId={tool.id} />;
  };

  return (
    <section className={styles.zone} aria-label="Center work surface">
      <LcarsZoneHeader
        eyebrow="CTR-00"
        title={
          activeDescriptor?.name?.toUpperCase() ??
          (hasTabs ? 'SELECT A TAB' : 'WORK SURFACE')
        }
        indicatorColor={hasTabs ? theme.colors.green : undefined}
      />

      {split === 'none' ? (
        <>
          <ZoneTabStrip zone="center" tools={tools} activeId={activeTabId} />
          <div
            className={`${styles.content} ${hasTabs ? '' : styles.contentEmpty}`}
          >
            {renderTool(activeTool)}
          </div>
        </>
      ) : (
        <div
          className={`${styles.splitRoot} ${
            split === 'vertical' ? styles.splitVertical : styles.splitHorizontal
          }`}
        >
          <SplitPane
            tools={tools}
            activeTabId={activeTabId}
            side="a"
            renderTool={renderTool}
          />
          <SplitPane
            tools={tools}
            activeTabId={activeTabId}
            side="b"
            renderTool={renderTool}
          />
        </div>
      )}
    </section>
  );
};

interface SplitPaneProps {
  tools: OpenTool[];
  activeTabId: string | null;
  side: 'a' | 'b';
  renderTool: (tool: OpenTool | null) => ReactNode;
}

const SplitPane: FC<SplitPaneProps> = ({ tools, activeTabId, side, renderTool }) => {
  const sideTools = tools.filter((t) => t.splitSide === side);
  const activeOnSide =
    sideTools.find((t) => t.id === activeTabId) ??
    sideTools[sideTools.length - 1] ??
    null;
  return (
    <div className={styles.splitPane}>
      <ZoneTabStrip
        zone="center"
        tools={tools}
        activeId={activeTabId}
        filterSide={side}
      />
      <div
        className={`${styles.content} ${sideTools.length === 0 ? styles.contentEmpty : ''}`}
      >
        {sideTools.length === 0 ? (
          <div className={styles.splitEmpty}>
            <span>SIDE {side.toUpperCase()} · EMPTY</span>
          </div>
        ) : (
          renderTool(activeOnSide)
        )}
      </div>
    </div>
  );
};
