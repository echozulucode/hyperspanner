import { useCallback, useMemo, useState } from 'react';
import type { FC } from 'react';
import { TopRail } from './TopRail';
import { LeftNavigator } from './LeftNavigator';
import { CenterZone } from './CenterZone';
import type { CenterTab } from './CenterZone';
import { RightZone } from './RightZone';
import { BottomZone } from './BottomZone';
import { useZoneState } from './useZoneState';
import styles from './AppShell.module.css';

export interface AppShellProps {
  /** Navigate to the primitive gallery (dev affordance on the top rail). */
  onOpenGallery?: () => void;
}

/**
 * AppShell — five-zone grid composition.
 *
 *   ┌─────────────────────────────────────────┐
 *   │ top rail                                │
 *   ├────────┬─────────────────────┬──────────┤
 *   │  left  │      center         │  right   │
 *   │  nav   │                     │          │
 *   │        ├─────────────────────┤          │
 *   │        │      bottom         │          │
 *   └────────┴─────────────────────┴──────────┘
 *
 * Zone collapse is driven by CSS variables (`--shell-*-width`, `--shell-*-height`).
 * The left navigator always renders so its rail-elbow persists; the right and
 * bottom zones collapse to 0 via the grid template.
 *
 * Phase 2 wires local state for a handful of tabs so CenterZone is reviewable.
 * Phase 3 migrates tab state into the Zustand workspace store.
 */
export const AppShell: FC<AppShellProps> = ({ onOpenGallery }) => {
  const { open, toggle, reset } = useZoneState();

  const [tabs, setTabs] = useState<CenterTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openSampleTool = useCallback(() => {
    const id = 'sample-json-validator';
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [...prev, { id, label: 'JSON Validator' }];
    });
    setActiveTabId(id);
  }, []);

  const handleSelectTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const handleCloseTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          setActiveTabId(next.length ? next[next.length - 1].id : null);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const handleOpenTool = useCallback((toolId: string) => {
    const label = toolLabelFor(toolId);
    setTabs((prev) => {
      if (prev.some((t) => t.id === toolId)) return prev;
      return [...prev, { id: toolId, label }];
    });
    setActiveTabId(toolId);
  }, []);

  const handleResetLayout = useCallback(() => {
    reset();
    setTabs([]);
    setActiveTabId(null);
  }, [reset]);

  const activeTool = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const gridClasses = [
    styles.shell,
    !open.left && styles.leftClosed,
    !open.right && styles.rightClosed,
    !open.bottom && styles.bottomClosed,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={gridClasses}>
      <div className={styles.top}>
        <TopRail
          activeToolTitle={activeTool?.label}
          onResetLayout={handleResetLayout}
          onOpenPalette={() => {
            /* Phase 5 wires command palette */
          }}
          onOpenGallery={onOpenGallery}
        />
      </div>

      <div className={styles.nav}>
        {open.left ? (
          <LeftNavigator activeToolId={activeTabId ?? undefined} onOpenTool={handleOpenTool} />
        ) : (
          <button
            type="button"
            className={styles.navRestoreButton}
            onClick={() => toggle('left')}
            aria-label="Expand navigator (Cmd/Ctrl+B)"
          >
            ⟩
          </button>
        )}
      </div>

      <div className={styles.center}>
        <CenterZone
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onOpenSampleTool={openSampleTool}
        />
      </div>

      <div className={styles.right}>
        <RightZone collapsed={!open.right} onToggle={() => toggle('right')} />
      </div>

      <div className={styles.bottom}>
        <BottomZone collapsed={!open.bottom} onToggle={() => toggle('bottom')} />
      </div>
    </div>
  );
};

/**
 * Translate a nav-tool id to a human label. Matches the placeholder registry in
 * LeftNavigator; replaced by the real registry lookup in Phase 4.
 */
function toolLabelFor(toolId: string): string {
  const map: Record<string, string> = {
    'text-diff': 'Text Diff',
    'case-transform': 'Case Transform',
    'whitespace-clean': 'Whitespace Clean',
    'json-validator': 'JSON Validator',
    'yaml-validator': 'YAML Validator',
    'regex-tester': 'Regex Tester',
    'hash-workbench': 'Hash Workbench',
    'base64-pad': 'Base64 Pad',
    'url-codec': 'URL Codec',
    'hex-inspector': 'Hex Inspector',
    'protobuf-decode': 'Protobuf Decode',
    'cidr-calc': 'CIDR Calculator',
    'tls-inspector': 'TLS Inspector',
  };
  return map[toolId] ?? toolId;
}
