import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LcarsPill, LcarsStandardLayout } from '@hyperspanner/lcars-ui';
import { LeftNavigator } from './LeftNavigator';
import { CenterZone } from './CenterZone';
import { RightZone } from './RightZone';
import { BottomZone } from './BottomZone';
import { CascadeStatus } from './ToolStatusPanels';
import { CommandPalette } from './CommandPalette';
import { UpdaterBanner } from './UpdaterBanner';
import { useShellShortcuts } from './useZoneState';
import { useWorkspaceStore, useTrackOpen } from '../state';
import {
  useUpdaterHasUpdate,
  useUpdaterStore,
} from '../state/useUpdater';
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
  // Keep `themeName` + `setTheme` available for the `cycleTheme`
  // callback below — the command palette still surfaces a "Cycle
  // theme" action so keyboard-first users can flip variants without
  // opening Settings. The top-rail theme pill is gone; the only
  // surface that uses these is the palette wiring.
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
  const setActive = useWorkspaceStore((s) => s.setActive);
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

  // HOME button — clears the center zone's active tab so CenterZone
  // falls back to rendering HomeView. Open tools stay docked in the
  // tab strip so the user can click a tab to return to a tool. In
  // split mode this only clears the active side; the SplitPane on
  // the other side keeps its last-active tool. Document this if it
  // becomes confusing in practice.
  const handleGoHome = useCallback(() => {
    setActive('center', null);
  }, [setActive]);

  // SETTINGS button — opens the system-settings tool in the center
  // zone. Single-instance, so a second click focuses + pulses the
  // existing settings tab rather than opening a duplicate.
  const handleOpenSettings = useCallback(() => {
    openTool('system-settings', 'center');
  }, [openTool]);

  // Auto-update integration. The on-launch check fires once after
  // mount; subsequent re-renders are guarded by the store's
  // `hasChecked` flag so we don't re-poll on every state update.
  // Failures are silent at the UI layer (offline tolerance) — the
  // store transitions to `error`, which the badge + banner ignore.
  // Settings → Updates surfaces the error message if the user
  // explicitly looks.
  //
  // Dev-mode policy: SKIP the auto-check entirely when running under
  // `vite dev` / `pnpm tauri:dev` / vitest. The running build is
  // typically 0.0.0 (the version in the working tree) and would
  // perpetually flag the latest published release as "available",
  // which is noisy during development. The "Check now" button in
  // Settings → Updates is NOT gated, so manual checks still work in
  // dev — useful for testing the update UI itself. `import.meta.env.DEV`
  // is Vite's build-time constant, true in dev and tests, false in
  // production builds.
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);
  const hasCheckedForUpdates = useUpdaterStore((s) => s.hasChecked);
  const hasUpdate = useUpdaterHasUpdate();
  useEffect(() => {
    if (hasCheckedForUpdates) return;
    if (import.meta.env.DEV) return;
    void checkForUpdates();
  }, [hasCheckedForUpdates, checkForUpdates]);

  const cycleTheme = useCallback(() => {
    // Theme cycling lives inside the Settings view now. The command
    // palette still wires to a `cycleTheme` callback for keyboard-
    // first users; we keep the function here so the palette wiring
    // below stays unchanged. If/when settings exposes a richer theme
    // picker, this becomes "open settings + scroll to Appearance"
    // and the palette entry can update accordingly.
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
    {
      // Low-profile toggle — collapses the entire top row (banner +
      // nav pills + top bar + elbow) for small-screen / laptop-short
      // workflows. An edge chevron hugs the top of the viewport as
      // the restore affordance; the nav-row chevron pill also
      // toggles.
      id: 'zone.top',
      description: 'Toggle top chrome',
      key: 't',
      mod: true,
      shift: true,
      whenTyping: 'block',
      run: () => toggleZone('top'),
    },
  ]);

  // Rail color hand-off — the bottom rail's quarter-circle lands on the
  // FIRST panel in the bottomPanels stack. The LeftNavigator exports
  // NAV_RAIL_COLOR so both sides stay in sync; see its module.
  const topRailColor = theme.colors.orange;
  const bottomRailColor = theme.colors.africanViolet;

  /*
   * Top-rail navigation cluster.
   *
   * Design principle: the top rail is the only persistent global
   * chrome in the app. Every pixel competes with the active tool, so
   * the bar should hold things that are reached for many times per
   * session AND that affect global (not tool) state. Things that
   * belong elsewhere:
   *   - Theme switching → Settings → Appearance.
   *   - Layout presets → HomeView's preset cards + command palette.
   *   - Reset workspace → command palette + Settings (it's a panic
   *     button, not a daily-use control).
   *
   * Things that earn their pixels here:
   *   - PALETTE (⌘K) — universal launcher, indisputable.
   *   - HOME — when several tools are open, get back to the
   *     launchpad without closing them. Without this button there's
   *     no one-click path back to HomeView once a tool is active.
   *   - SETTINGS — opens the settings tool (Phase 8 expands; for
   *     now it stubs the theme picker).
   *   - ▲ collapse-top — tucks the entire top row away on small
   *     screens / laptops with limited vertical real-estate.
   *
   * Dev-only affordances (visible only when `import.meta.env.DEV`):
   *   - GALLERY, SCREENS — primitive gallery + de-risk screens hub.
   *
   * `import.meta.env.DEV` is Vite's build-time constant: `true` in
   * `pnpm dev` (and in vitest), `false` in `pnpm build`. The
   * production bundle tree-shakes the conditional branches so these
   * pills don't ship to release builds.
   */
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
        color={theme.colors.butterscotch}
        onClick={handleGoHome}
        aria-label="Show home / launchpad"
      >
        ⌂ HOME
      </LcarsPill>
      <LcarsPill
        size="small"
        rounded="none"
        color={theme.colors.africanViolet}
        onClick={handleOpenSettings}
        aria-label={
          hasUpdate
            ? 'Open settings (update available)'
            : 'Open settings'
        }
      >
        {/* The update badge is a tiny orange disc that hangs off the
          * SETTINGS label. CSS-only — `::after` would be cleaner but
          * LcarsPill doesn't expose a pseudo-element hook, so we
          * inline a span sized to fit. The aria-label above carries
          * the announcement; this dot is decorative. */}
        ⚙ SETTINGS
        {hasUpdate ? (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: theme.colors.orange,
              marginLeft: '0.4rem',
              verticalAlign: 'middle',
              boxShadow: `0 0 4px ${theme.colors.orange}`,
            }}
          />
        ) : null}
      </LcarsPill>
      {import.meta.env.DEV && (
        <LcarsPill
          size="small"
          rounded="none"
          color={theme.colors.orange}
          onClick={onOpenGallery}
          aria-label="Open primitive gallery (dev)"
        >
          GALLERY
        </LcarsPill>
      )}
      {import.meta.env.DEV && (
        <LcarsPill
          size="small"
          rounded="none"
          color={theme.colors.red}
          onClick={onOpenScreens}
          aria-label="Open de-risk screens hub (dev)"
        >
          SCREENS
        </LcarsPill>
      )}
      <LcarsPill
        size="small"
        rounded="right"
        color={theme.colors.lilac}
        onClick={() => toggleZone('top')}
        aria-label="Collapse top chrome (Cmd/Ctrl+Shift+T)"
      >
        ▲
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
  //
  // `--lcars-font-size-banner` pins the banner font size so the top
  // chrome stays visually stable across window sizes. The primitive's
  // default is `clamp(1.25rem, 0.75rem + 4vw, 4rem)` — a viewport-
  // responsive size that causes the banner to grow/shrink by a few
  // pixels as the window is maximized vs restored, which reads as
  // "top segment height changes on resize" even though the 185px row
  // itself never moves.
  //
  // We pin to 3rem (48px at html:1rem) rather than 4rem for one sharp
  // reason: apps/desktop/src/styles/global.css sets `html { font-size:
  // 1.2rem }` at ≤1300px viewports, so 4rem actually evaluates to
  // ~76.8px there — not 64px — and the taller banner blows the top
  // row's 185px budget, clipping the bottom topBar segment entirely
  // (exactly the symptom reported on 2026-04-23). 3rem gives us 48px
  // at normal widths and 57.6px at the 1.2rem-html widths, both of
  // which fit comfortably above the ~48px bannerRow + 10px spacer +
  // 36px topBarSlot budget. The banner still looks generous; it just
  // doesn't lord over the chrome. See lesson #43.
  const layoutStyle: CSSProperties = {
    '--lcars-layout-top-spacer-min': '10px',
    '--lcars-layout-top-bar-margin': '0.5rem',
    '--lcars-layout-nav-gap-x': '0.2rem',
    '--lcars-layout-nav-gap-y': '0.3rem',
    // Top-row height: 170px. Sits just 10px above the rail's 160px
    // corner radius — the minimum clearance that keeps the curve intact
    // while keeping the top rail visually SHORTER than the bottom rail
    // (which is always ≥180px because of its hasChildren padding).
    // Earlier iterations used 185px, but that made the top and bottom
    // rails look equal-height, contradicting the compact-top design
    // intent. Content fit: banner(48) + pad(12) + bannerRow(48) +
    // spacer-min(10) + topBarSlot(36) ≈ 154px, leaving ~16px of
    // breathing room inside the 170px pin — enough for subpixel
    // rounding without blowing the row.
    '--lcars-layout-top-row-height': '170px',
    '--lcars-font-size-banner': '3rem',
    // Flush the workspace against the right edge of the window. The
    // Inspector should not sit behind any decorative breathing margin —
    // it's a vertical edge panel, anchored to the viewport edge. We
    // zero the primitive's wrap-right + main-right padding here; the
    // 5px container-left / 10px container-top remain intact so the
    // rounded left rail still has its black-strip breathing room.
    '--lcars-layout-wrap-padding-right': '0',
    '--lcars-layout-main-padding-right': '0',
    // Release the stable scrollbar gutter — without this, .main reserves
    // ~15px on the right even when no scrollbar is visible, which reads
    // as a phantom margin beside the (already flush) Inspector stub. We
    // accept the canonical LCARS tradeoff (a tiny content shift if a
    // scrollbar appears) in exchange for the edge-flush look the user
    // specifically asked for. Per-zone scrolling in the workspace grid
    // keeps the "scrollbar appears on .main" case to a minimum anyway —
    // .main itself rarely overflows.
    '--lcars-layout-main-scrollbar-gutter': 'auto',
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
      topCollapsed={collapsed.top}
      className={styles.layoutRoot}
      style={layoutStyle}
    >
      {/* Main slot is a flex column so the UpdaterBanner can sit
        * above the workspace grid without participating in the grid
        * itself. The banner renders only when a new version is
        * available + not dismissed (`flex: 0 0 auto` keeps it from
        * stealing space from the workspace below). */}
      <div className={styles.mainStack}>
        <UpdaterBanner onOpenSettings={handleOpenSettings} />
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
      </div>
      {collapsed.top && (
        <button
          type="button"
          className={styles.topRestoreButton}
          onClick={() => toggleZone('top')}
          aria-label="Expand top chrome (Cmd/Ctrl+Shift+T)"
        >
          ▼
        </button>
      )}
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
