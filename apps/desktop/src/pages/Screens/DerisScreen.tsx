import type { FC } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';
import { useTheme } from '../../contexts/ThemeContext';
import { findScreen } from './registry';
import styles from './DerisScreen.module.css';

export interface DerisScreenProps {
  name: string;
  onBackToHub: () => void;
  onBackToShell: () => void;
}

/**
 * DerisScreen — wrapper that renders a named de-risk screen full-viewport
 * with a tiny floating nav cluster. Unknown / unimplemented screens
 * render a fallback.
 */
export const DerisScreen: FC<DerisScreenProps> = ({
  name,
  onBackToHub,
  onBackToShell,
}) => {
  const { theme } = useTheme();
  const entry = findScreen(name);
  const Screen = entry?.Component;

  return (
    <div className={styles.host}>
      {Screen ? (
        <Screen />
      ) : (
        <div className={styles.fallback}>
          <h1>Screen not found</h1>
          <p>
            <code>{name}</code>{' '}
            {entry
              ? '— registered but not yet implemented.'
              : '— unknown screen.'}
          </p>
          <p>See docs/plan-006 for the catalog.</p>
        </div>
      )}

      <div className={styles.floatingNav}>
        <LcarsPill
          size="small"
          rounded="left"
          color={theme.colors.africanViolet}
          onClick={onBackToHub}
        >
          ← SCREENS
        </LcarsPill>
        <LcarsPill
          size="small"
          rounded="right"
          color={theme.colors.bluey}
          onClick={onBackToShell}
        >
          ← SHELL
        </LcarsPill>
      </div>
    </div>
  );
};
