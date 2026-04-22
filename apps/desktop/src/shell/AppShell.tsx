import { useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TopRail } from './TopRail';
import { LeftNavigator } from './LeftNavigator';
import { CenterZone } from './CenterZone';
import { RightZone } from './RightZone';
import { BottomZone } from './BottomZone';
import { useShellShortcuts } from './useZoneState';
import { useWorkspaceStore } from '../state';
import { getTool } from '../tools';
import styles from './AppShell.module.css';

export interface AppShellProps {
  /** Navigate to the primitive gallery (dev affordance on the top rail). */
  onOpenGallery?: () => void;
  /** Navigate to the de-risk screens hub (dev affordance on the top rail). */
  onOpenScreens?: () => void;
}

/**
 * AppShell — five-zone grid composition, wired to the workspace store.
 *
 * Phase 3 replaced Phase 2's local tab state with the Zustand `useWorkspaceStore`.
 * The store drives:
 *   - which tools are open and in which zones (`open: OpenTool[]`)
 *   - which tab is active per zone (`activeByZone`)
 *   - center split mode (`centerSplit`)
 *   - zone collapse state (`collapsed`)
 *   - active preset (`layoutPreset`)
 *
 * Keyboard shortcuts (⌘B / ⌘J / ⌘⇧E) toggle the matching zone via the store.
 * The Left navigator calls `openTool(id)` to open tools in their default zone.
 */
export const AppShell: FC<AppShellProps> = ({ onOpenGallery, onOpenScreens }) => {
  const collapsed = useWorkspaceStore(useShallow((s) => s.collapsed));
  const centerSplit = useWorkspaceStore((s) => s.centerSplit);

  const centerTools = useWorkspaceStore(
    useShallow((s) => s.open.filter((t) => t.zone === 'center')),
  );
  const rightTools = useWorkspaceStore(
    useShallow((s) => s.open.filter((t) => t.zone === 'right')),
  );
  const bottomTools = useWorkspaceStore(
    useShallow((s) => s.open.filter((t) => t.zone === 'bottom')),
  );

  const centerActive = useWorkspaceStore((s) => s.activeByZone.center);
  const rightActive = useWorkspaceStore((s) => s.activeByZone.right);
  const bottomActive = useWorkspaceStore((s) => s.activeByZone.bottom);

  const openTool = useWorkspaceStore((s) => s.openTool);
  const toggleZone = useWorkspaceStore((s) => s.toggleZone);
  const resetLayout = useWorkspaceStore((s) => s.resetLayout);

  useShellShortcuts(useCallback((zone) => toggleZone(zone), [toggleZone]));

  const openToolIds = useMemo<ReadonlySet<string>>(
    () =>
      new Set<string>([
        ...centerTools.map((t) => t.id),
        ...rightTools.map((t) => t.id),
        ...bottomTools.map((t) => t.id),
      ]),
    [centerTools, rightTools, bottomTools],
  );

  const handleOpenTool = useCallback(
    (toolId: string) => {
      const descriptor = getTool(toolId);
      openTool(toolId, descriptor?.defaultZone);
    },
    [openTool],
  );

  const handleOpenSample = useCallback(() => {
    const descriptor = getTool('json-validator');
    if (descriptor) openTool(descriptor.id, descriptor.defaultZone);
  }, [openTool]);

  const activeCenterDescriptor = useMemo(() => {
    if (!centerActive) return null;
    return getTool(centerActive);
  }, [centerActive]);

  const gridClasses = [
    styles.shell,
    collapsed.left && styles.leftClosed,
    collapsed.right && styles.rightClosed,
    collapsed.bottom && styles.bottomClosed,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={gridClasses}>
      <div className={styles.top}>
        <TopRail
          activeToolTitle={activeCenterDescriptor?.name}
          onResetLayout={resetLayout}
          onOpenPalette={() => {
            /* Phase 5 wires command palette */
          }}
          onOpenGallery={onOpenGallery}
          onOpenScreens={onOpenScreens}
        />
      </div>

      <div className={styles.nav}>
        {!collapsed.left ? (
          <LeftNavigator
            activeToolId={centerActive ?? rightActive ?? bottomActive ?? null}
            openToolIds={openToolIds}
            onOpenTool={handleOpenTool}
          />
        ) : (
          <button
            type="button"
            className={styles.navRestoreButton}
            onClick={() => toggleZone('left')}
            aria-label="Expand navigator (Cmd/Ctrl+B)"
          >
            ⟩
          </button>
        )}
      </div>

      <div className={styles.center}>
        <CenterZone
          tools={centerTools}
          activeTabId={centerActive}
          split={centerSplit}
          onOpenSampleTool={handleOpenSample}
        />
      </div>

      <div className={styles.right}>
        {!collapsed.right ? (
          <RightZone
            collapsed={false}
            onToggle={() => toggleZone('right')}
            tools={rightTools}
            activeTabId={rightActive}
          />
        ) : (
          <button
            type="button"
            className={styles.rightRestoreButton}
            onClick={() => toggleZone('right')}
            aria-label="Expand inspector (Cmd/Ctrl+Shift+E)"
          >
            INSPECTOR
          </button>
        )}
      </div>

      <div className={styles.bottom}>
        {!collapsed.bottom ? (
          <BottomZone
            collapsed={false}
            onToggle={() => toggleZone('bottom')}
            tools={bottomTools}
            activeTabId={bottomActive}
          />
        ) : (
          <button
            type="button"
            className={styles.bottomRestoreButton}
            onClick={() => toggleZone('bottom')}
            aria-label="Expand console (Cmd/Ctrl+J)"
          >
            CONSOLE
          </button>
        )}
      </div>
    </div>
  );
};
