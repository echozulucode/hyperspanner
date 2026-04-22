import type { FC, ReactNode } from 'react';
import { LcarsEmptyState, LcarsPill } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import type { CenterSplit, OpenTool, SplitSide } from '../state';
import { useWorkspaceStore } from '../state';
import { getTool } from '../tools';
import { ZoneTabStrip } from './ZoneTabStrip';
import { PaneDropTarget } from './PaneDropTarget';
import type { DropRegion } from './PaneDropTarget';
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

  const moveTool = useWorkspaceStore((s) => s.moveTool);
  const splitCenter = useWorkspaceStore((s) => s.splitCenter);

  /**
   * Single-pane drop composition:
   *   - center  → move the tool into center (no split change)
   *   - left    → split vertical, tool lands on side 'a' (leftmost)
   *   - right   → split vertical, tool lands on side 'b' (rightmost)
   *   - top     → split horizontal, tool lands on side 'a' (top)
   *   - bottom  → split horizontal, tool lands on side 'b' (bottom)
   *
   * Order matters: splitCenter runs first so the splitSide assignment on
   * the subsequent moveTool lands in a valid split state.
   */
  const handleCenterSingleDrop = (region: DropRegion, toolId: string) => {
    if (region === 'center') {
      moveTool(toolId, 'center');
      return;
    }
    const dir: 'vertical' | 'horizontal' =
      region === 'left' || region === 'right' ? 'vertical' : 'horizontal';
    const side: SplitSide =
      region === 'left' || region === 'top' ? 'a' : 'b';
    splitCenter(dir);
    moveTool(toolId, 'center', side);
  };

  /** In a split pane, drops on the side only move the tool onto that side. */
  const handleSideDrop = (side: SplitSide) => (_region: DropRegion, toolId: string) => {
    moveTool(toolId, 'center', side);
  };

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
    return <ToolBody toolId={tool.id} zone="center" />;
  };

  return (
    <section className={styles.zone} aria-label="Center work surface">
      {/* Zone header removed — the layout's banner + LcarsChip already
       * surface the active tool; repeating it here was redundant chrome. */}

      {split === 'none' ? (
        <>
          <ZoneTabStrip zone="center" tools={tools} activeId={activeTabId} />
          <div
            className={`${styles.content} ${hasTabs ? '' : styles.contentEmpty} ${styles.dropHost}`}
          >
            {renderTool(activeTool)}
            <PaneDropTarget
              variant="center-single"
              label={activeDescriptor?.name?.toUpperCase() ?? 'CENTER'}
              onDrop={handleCenterSingleDrop}
            />
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
            onDrop={handleSideDrop('a')}
          />
          <SplitPane
            tools={tools}
            activeTabId={activeTabId}
            side="b"
            renderTool={renderTool}
            onDrop={handleSideDrop('b')}
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
  onDrop: (region: DropRegion, toolId: string) => void;
}

const SplitPane: FC<SplitPaneProps> = ({
  tools,
  activeTabId,
  side,
  renderTool,
  onDrop,
}) => {
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
        className={`${styles.content} ${sideTools.length === 0 ? styles.contentEmpty : ''} ${styles.dropHost}`}
      >
        {sideTools.length === 0 ? (
          <div className={styles.splitEmpty}>
            <span>SIDE {side.toUpperCase()} · EMPTY</span>
          </div>
        ) : (
          renderTool(activeOnSide)
        )}
        <PaneDropTarget
          variant="center-side"
          label={`SIDE ${side.toUpperCase()}`}
          onDrop={onDrop}
        />
      </div>
    </div>
  );
};
