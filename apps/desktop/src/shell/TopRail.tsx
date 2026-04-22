import type { FC } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeName } from '../themes';
import styles from './TopRail.module.css';

export interface TopRailProps {
  /** Current active tool title shown in the wide band. */
  activeToolTitle?: string;
  /** Short workspace/title label (brand region). Defaults to "HYPERSPANNER". */
  workspaceTitle?: string;
  /** Called when the reset-layout pill is invoked. */
  onResetLayout?: () => void;
  /** Called when the command-palette pill is invoked. */
  onOpenPalette?: () => void;
  /** Called when the gallery (dev) affordance is invoked. */
  onOpenGallery?: () => void;
  /** Called when the screens-hub (dev) affordance is invoked. */
  onOpenScreens?: () => void;
}

const themeOrder: ThemeName[] = ['picard-modern', 'classic', 'nemesis-blue', 'lower-decks'];

export const TopRail: FC<TopRailProps> = ({
  activeToolTitle,
  workspaceTitle = 'HYPERSPANNER',
  onResetLayout,
  onOpenPalette,
  onOpenGallery,
  onOpenScreens,
}) => {
  const { themeName, setTheme, theme } = useTheme();

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(themeName);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setTheme(next);
  };

  /*
   * Segmented top rail — LCARS-24.2 grammar.
   *
   * The rail is a single horizontal band partitioned into flat-edged
   * segments separated by the LCARS black seams (via `gap`). From left
   * to right:
   *
   *   1. BRAND — rail-color strip sized to the nav column, so its
   *      right edge aligns vertically with the elbow that welds into
   *      the content area below. The bg uses --shell-rail-top-color
   *      so the elbow, the brand, and the optional first bar segment
   *      all share the same hue (lesson #22: rail-color-first-segment
   *      invariant makes the elbow's 1px overlap invisible).
   *   2. ELBOW CAP — short rail-color continuation that extends past
   *      the elbow's horizontal extent, giving the curve somewhere
   *      to "land" before the next-color segment starts. Without this
   *      the curve would look amputated — the elbow's quarter-crescent
   *      needs a strip of its own color both above (TopRail) and to
   *      the right (this cap) to read as a welded corner.
   *   3. ACTIVE TOOL — african-violet band with a TOOL eyebrow and
   *      the active tool title. Flat edges on both sides, flex:1 so
   *      it absorbs the available width.
   *   4. TAIL — short decorative butterscotch segment, half-height
   *      so it breaks the rhythm and signals "end of the informational
   *      region, start of the controls region" (LCARS commonly uses a
   *      half-height segment as a visual comma).
   *   5. CONTROLS — pill cluster. First pill rounded-left, last pill
   *      rounded-right, inner pills flat — the usual LCARS button
   *      stack convention (lesson #21: rounded ends on the outside of
   *      a group, not on every pill).
   */
  return (
    <div className={styles.rail}>
      <div className={styles.brandBand}>{workspaceTitle}</div>
      <div className={styles.elbowCap} aria-hidden="true" />
      <div
        className={`${styles.toolTitleBand} ${activeToolTitle ? '' : styles.toolTitleEmpty}`}
      >
        <span className={styles.eyebrow}>TOOL</span>
        <span className={styles.toolTitleText}>
          {activeToolTitle ?? 'NO ACTIVE TOOL — OPEN ONE FROM THE NAVIGATOR'}
        </span>
      </div>
      <div className={styles.tailSegment} aria-hidden="true" />
      <div className={styles.controls}>
        <LcarsPill
          size="small"
          rounded="left"
          color={theme.colors.bluey}
          onClick={onOpenPalette}
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
          onClick={onResetLayout}
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
      </div>
    </div>
  );
};
