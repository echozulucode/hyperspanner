import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LcarsPill, LcarsStandardLayout } from '@hyperspanner/lcars-ui';
import { LeftNavigator } from './LeftNavigator';
import { CenterZone } from './CenterZone';
import { RightZone } from './RightZone';
import { BottomZone } from './BottomZone';
import { CascadeStatus } from './ToolStatusPanels';
import { CommandPalette } from './CommandPalette';
import { useShellShortcuts } from './useZoneState';
import { useWorkspaceStore, useTrackOpen } from '../state';
import { getTool } from '../tools';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeName } from '../themes';
import { useGlobalShortcuts, ShortcutHelp } from '../keys';
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

  // Recents tracking — every path that opens a tool (nav click, sample
  // "try it" button, and soon the command palette) routes through
  // handleOpenTool, so this is the single chokepoint where we can
  // update history without sprinkling trackOpen() across call sites.
  const trackOpen = useTrackOpen();

  useShellShortcuts(useCallback((zone) => toggleZone(zone), [toggleZone]));

  // Command palette state — the palette is a modal overlay owned by the
  // shell because its actions (openTool, resetLayout, cycleTheme) all
  // live up here. Keeping the state at this level avoids threading a
  // second "open palette" callback through every child that needs it.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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
      // Track AFTER opening so a descriptor-less id (stale registry
      // entry) still updates the recents list — the workspace store
      // is tolerant of unknown ids and recents is purely informational.
      trackOpen(toolId);
    },
    [openTool, trackOpen],
  );

  const handleOpenPalette = useCallback(() => setPaletteOpen(true), []);
  const handleClosePalette = useCallback(() => setPaletteOpen(false), []);
  const handleCloseHelp = useCallback(() => setHelpOpen(false), []);

  const cycleTheme = useCallback(() => {
    const idx = themeOrder.indexOf(themeName);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setTheme(next);
  }, [themeName, setTheme]);

  // Global shortcut bindings not covered by useShellShortcuts. The zone
  // toggles still live there because they share a "when typing, ignore"
  // policy; the palette and help overlay have different gating rules
  // (⌘K should fire even from inputs; ? should NOT). useGlobalShortcuts
  // consults each binding's own policy.
  useGlobalShortcuts([
    {
      id: 'palette.open',
      description: 'Open command palette',
      key: 'k',
      mod: true,
      whenTyping: 'allow',
      run: () => setPaletteOpen((prev) => !prev),
    },
    {
      id: 'shortcuts.help',
      description: 'Show keyboard shortcuts',
      key: '?',
      shift: true,
      whenTyping: 'block',
      run: () => setHelpOpen((prev) => !prev),
    },
  ]);

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
        onClick={handleOpenPalette}
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

  // Deliberately NO titleChip / "secondary title" here. An earlier
  // iteration rendered the active tool's name as an LcarsChip beside
  // the banner, but that composition pushed the titleRow wider than
  // its container on longer tool names (TEXT DIFF, WHITESPACE CLEAN,
  // etc.), which used to wrap the title row onto two lines and clip
  // the top bar + welded elbow. The active tool is already surfaced
  // in the CascadeStatus readout (ACTIVE: <name>), so dropping the
  // chip is a clean simplification: one canonical place to look, and
  // the top-row chrome stays at its pinned height regardless of which
  // tool is selected. See LcarsStandardLayout.module.css .wrap.topRow
  // and .titleRow for the matching primitive-side design notes.

  // Layout-primitive overrides. See previous commit history for full
  // rationale; keeping the summary short here so the render tree below
  // is easier to scan.
  const layoutStyle: CSSProperties = {
    '--lcars-layout-top-spacer-min': '10px',
    '--lcars-layout-top-bar-margin': '0.5rem',
    '--lcars-layout-nav-gap-x': '0.2rem',
    '--lcars-layout-nav-gap-y': '0.3rem',
    '--lcars-layout-top-row-height': 'calc(160px + 25px)',
  } as CSSProperties;

  return (
    <LcarsStandardLayout
      title="HYPERSPANNER"
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
            onOpenTool={handleOpenTool}
            onOpenPalette={handleOpenPalette}
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
      <CommandPalette
        open={paletteOpen}
        onClose={handleClosePalette}
        onOpenTool={handleOpenTool}
        onResetLayout={resetLayout}
        onCycleTheme={cycleTheme}
      />
      <ShortcutHelp open={helpOpen} onClose={handleCloseHelp} />
    </LcarsStandardLayout>
  );
};
