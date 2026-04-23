import { useCallback, useMemo } from 'react';
import type { CSSProperties, FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LcarsChip, LcarsPill, LcarsStandardLayout } from '@hyperspanner/lcars-ui';
import { LeftNavigator } from './LeftNavigator';
import { CenterZone } from './CenterZone';
import { RightZone } from './RightZone';
import { BottomZone } from './BottomZone';
import { CascadeStatus } from './ToolStatusPanels';
import { useShellShortcuts } from './useZoneState';
import { useWorkspaceStore } from '../state';
import { getTool } from '../tools';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeName } from '../themes';
import styles from './AppShell.module.css';

export interface AppShellProps {
  /** Navigate to the primitive gallery (dev affordance on the top rail). */
  onOpenGallery?: () => void;
  /** Navigate to the de-risk screens hub (dev affordance on the top rail). */
  onOpenScreens?: () => void;
}

const themeOrder: ThemeName[] = ['picard-modern', 'classic', 'nemesis-blue', 'lower-decks'];

/**
 * AppShell — canonical LCARS two-row chrome.
 *
 * Switched from the old 3×3 grid to LcarsStandardLayout so the shell
 * reads as the same "standard layout" grammar used by the de-risk screens:
 *   - Top row: brand banner + nav pills + segmented top-framing bar,
 *     welded via the primitive's quarter-circle elbow into a curved
 *     decorative left rail.
 *   - Bottom row: segmented bottom-framing bar above the main workspace,
 *     welded via a mirror elbow into the tall left rail. The rail holds
 *     the tool navigator (categories as LcarsPanels).
 *
 * The workspace itself (CenterZone + RightZone + BottomZone) lives inside
 * the layout's `main` slot as a smaller CSS grid. Right / bottom zones
 * can still collapse to a stub with a restore affordance; ⌘J and ⌘⇧E
 * keyboard shortcuts are preserved. ⌘B still fires but has no visual
 * effect in this iteration (the left rail is always visible).
 */
export const AppShell: FC<AppShellProps> = ({ onOpenGallery, onOpenScreens }) => {
  const { theme, themeName, setTheme } = useTheme();

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

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(themeName);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setTheme(next);
  };

  // Rail color hand-off — the bottom rail's quarter-circle lands on the
  // FIRST panel in the bottomPanels stack. The LeftNavigator exports
  // NAV_RAIL_COLOR so both sides stay in sync; see its module.
  const topRailColor = theme.colors.orange;
  const bottomRailColor = theme.colors.africanViolet;

  const navigation = (
    <>
      <LcarsPill
        size="small"
        rounded="left"
        color={theme.colors.bluey}
        onClick={() => {
          /* Phase 5 wires command palette */
        }}
        aria-label="Command palette"
      >
        ⌘K · PALETTE
      </LcarsPill>
      <LcarsPill
        size="small"
        rounded="none"
        color={theme.colors.africanViolet}
        onClick={cycleTheme}
        aria-label={`Current theme ${themeName}. Click to cycle.`}
      >
        {themeName}
      </LcarsPill>
      <LcarsPill
        size="small"
        rounded="none"
        color={theme.colors.butterscotch}
        onClick={resetLayout}
        aria-label="Reset layout"
      >
        RESET
      </LcarsPill>
      <LcarsPill
        size="small"
        rounded="none"
        color={theme.colors.orange}
        onClick={onOpenGallery}
        aria-label="Open primitive gallery"
      >
        GALLERY
      </LcarsPill>
      <LcarsPill
        size="small"
        rounded="right"
        color={theme.colors.red}
        onClick={onOpenScreens}
        aria-label="Open de-risk screens hub"
      >
        SCREENS
      </LcarsPill>
    </>
  );

  const workspaceClasses = [
    styles.workspace,
    collapsed.right && styles.rightClosed,
    collapsed.bottom && styles.bottomClosed,
  ]
    .filter(Boolean)
    .join(' ');

  const activeTitle = activeCenterDescriptor?.name?.toUpperCase();

  // Active-tool marker rendered inline with the banner. Using LcarsChip
  // (size small, secondary variant) mirrors the "LcarsBanner · LcarsChip"
  // composition in the primitive gallery. undefined when no center tool
  // is active, so the primitive skips the titleRow wrapper entirely.
  const titleChip = activeTitle ? (
    <LcarsChip size="small" variant="secondary">
      {activeTitle}
    </LcarsChip>
  ) : undefined;

  // Layout-primitive overrides.
  //   --lcars-layout-top-spacer-min: 10px — compact floor for the spacer
  //      above the topBar; the 20px default adds visible gap we don't need.
  //   --lcars-layout-top-spacer-flex: 1 (DEFAULT) — the spacer KEEPS its
  //      grow so the topBar/elbow stay welded to the bottom of the row
  //      even when the rail's hasChildren intrinsic is taller than the
  //      banner+nav stack (which is always, with the authentic 160px
  //      rail curve). Never set this to 0 while topPanels is populated.
  //   --lcars-layout-top-bar-margin: 0.5rem — a hair of breathing space
  //      above the topBar without the old ~30px gap.
  //   --lcars-layout-nav-gap-x/y: 0.2rem — tight pill cluster; the default
  //      gaps (0.5rem / 0.65rem) felt too airy for a rapid switcher.
  //
  // Why no rail radius/padding override: a smaller top-rail corner made
  // the top/bottom rails visually asymmetric (tight 50px arc at the top
  // vs the canonical 160px arc at the bottom). Keeping both rails at
  // their 160px default restores LCARS-authentic symmetry. The side
  // effect — a taller top row driven by the rail's hasChildren intrinsic
  // (panels + 160px + 1.25rem of decorative padding) — is actually what
  // pins the row height stable: the rail's intrinsic is constant regardless
  // of which tool is active, so selecting a tool can't resize the header.
  const layoutStyle: CSSProperties = {
    '--lcars-layout-top-spacer-min': '10px',
    '--lcars-layout-top-bar-margin': '0.5rem',
    '--lcars-layout-nav-gap-x': '0.2rem',
    '--lcars-layout-nav-gap-y': '0.3rem',
    // Pin the top row to "just enough for the authentic 160px rail
    // curve plus a hair of straight edge above it". No topPanels means
    // leftFrameTop's intrinsic is 0; we want the curve's full quarter-
    // circle to render (requires >=160px height), with ~25px of straight
    // rail at the top for visual breathing. rightFrameTop's banner+nav+
    // bar content is absorbed by the spacer (flex:1) so the bar and
    // elbow stay welded to the bottom regardless of content wrap.
    '--lcars-layout-top-row-height': 'calc(160px + 25px)',
  } as CSSProperties;

  return (
    <LcarsStandardLayout
      title="HYPERSPANNER"
      titleChip={titleChip}
      titleLeading={<CascadeStatus />}
      navigation={navigation}
      bottomPanels={
        <LeftNavigator
          activeToolId={centerActive ?? rightActive ?? bottomActive ?? null}
          openToolIds={openToolIds}
          onOpenTool={handleOpenTool}
          railColor={bottomRailColor}
        />
      }
      topRailColor={topRailColor}
      bottomRailColor={bottomRailColor}
      trim={false}
      className={styles.layoutRoot}
      style={layoutStyle}
    >
      <div className={workspaceClasses}>
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
    </LcarsStandardLayout>
  );
};
