import type { FC, ReactNode } from 'react';
import type { CenterSplit, OpenTool, SplitSide } from '../state';
import { useWorkspaceStore } from '../state';
import { getTool } from '../tools';
import { HomeView } from '../screens';
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
  /** Invoked when the home view launchpad opens a tool. */
  onOpenTool?: (toolId: string) => void;
  /** Phase-5 palette hook. HomeView surfaces it in its hero affordances. */
  onOpenPalette?: () => void;
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
  onOpenTool,
  onOpenPalette,
}) => {
  const activeTool = tools.find((t) => t.id === activeTabId) ?? null;
  const activeDescriptor = activeTool ? getTool(activeTool.id) : null;
  // `hasTabs` was used to gate `.contentEmpty` on the wrapper; UX-3.3
  // dropped that class so the launchpad fills the area cleanly. Local
  // dropped along with the consumer.

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
      // No active tool ≡ the workspace is empty (or the active side of a
      // split is empty). Render HomeView as the launchpad; any click on a
      // tool card fires onOpenTool, which AppShell wires to openTool +
      // trackOpen so launching from home feeds recents.
      return (
        <HomeView
          onOpenTool={(id) => onOpenTool?.(id)}
          onOpenPalette={onOpenPalette}
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
          {/*
            * No `.contentEmpty` modifier in the no-tools case anymore —
            * the empty-state body here is the full HomeView launchpad,
            * not a small centered badge. `.contentEmpty`'s
            * `align-items: center` would (and did) center HomeView
            * vertically, which under flexbox + overflow-scroll positions
            * a too-tall child with a negative top offset that scrolling
            * can't reach. Result: the first row of tool cards rendered
            * permanently half-clipped at the scroll origin. Default
            * `.content` (`align-items: stretch`) lets HomeView fill the
            * area and scroll its own content normally via `.root`'s
            * `overflow-y: auto`. The split-pane empty-state below still
            * uses `.contentEmpty` because there it does want to center
            * a small "SIDE A · EMPTY" badge.
            */}
          <div className={`${styles.content} ${styles.dropHost}`}>
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
