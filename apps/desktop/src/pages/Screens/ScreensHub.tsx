import type { FC } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';
import { useTheme } from '../../contexts/ThemeContext';
import { SCREENS, type ScreenName } from './registry';
import styles from './ScreensHub.module.css';

export interface ScreensHubProps {
  onBack: () => void;
  onOpenScreen: (name: ScreenName) => void;
}

/**
 * ScreensHub — index of every de-risk screen. Disabled entries are
 * screens that haven't been built yet (see registry.ts). Each card
 * summarizes what the screen demonstrates.
 */
export const ScreensHub: FC<ScreensHubProps> = ({ onBack, onOpenScreen }) => {
  const { theme } = useTheme();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>De-Risk Screens</h1>
          <div className={styles.subtitle}>
            Full-viewport LCARS pattern studies — iterate on visuals without
            the AppShell. See docs/plan-006.
          </div>
        </div>
        <div className={styles.navCluster}>
          <LcarsPill
            size="small"
            rounded="both"
            color={theme.colors.bluey}
            onClick={onBack}
            aria-label="Return to application shell"
          >
            ← SHELL
          </LcarsPill>
        </div>
      </header>

      <div className={styles.grid}>
        {SCREENS.map((entry) => {
          const ready = Boolean(entry.Component);
          return (
            <button
              key={entry.id}
              type="button"
              className={`${styles.card} ${ready ? '' : styles.cardDisabled}`}
              disabled={!ready}
              onClick={() => ready && onOpenScreen(entry.id)}
            >
              <span className={styles.cardEyebrow}>{entry.id.toUpperCase()}</span>
              <span className={styles.cardTitle}>{entry.title}</span>
              <span className={styles.cardSummary}>{entry.summary}</span>
              <span className={styles.cardStatus}>
                {ready ? 'READY' : 'STUB — not implemented'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
