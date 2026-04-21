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
}

const themeOrder: ThemeName[] = ['picard-modern', 'classic', 'nemesis-blue', 'lower-decks'];

export const TopRail: FC<TopRailProps> = ({
  activeToolTitle,
  workspaceTitle = 'HYPERSPANNER',
  onResetLayout,
  onOpenPalette,
  onOpenGallery,
}) => {
  const { themeName, setTheme, theme } = useTheme();

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(themeName);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setTheme(next);
  };

  return (
    <div className={styles.rail}>
      <div className={styles.left}>
        <div className={styles.brandBand}>{workspaceTitle}</div>
      </div>

      <div className={styles.middle}>
        <div
          className={`${styles.toolTitleBand} ${activeToolTitle ? '' : styles.toolTitleEmpty}`}
        >
          <span className={styles.eyebrow}>TOOL</span>
          <span>{activeToolTitle ?? 'NO ACTIVE TOOL — OPEN ONE FROM THE NAVIGATOR'}</span>
        </div>
      </div>

      <div className={styles.right}>
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
            rounded="right"
            color={theme.colors.orange}
            onClick={onOpenGallery}
            aria-label="Open primitive gallery"
          >
            GALLERY
          </LcarsPill>
        </div>
      </div>
    </div>
  );
};
