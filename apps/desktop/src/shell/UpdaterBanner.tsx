import type { FC } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import {
  useUpdaterShouldShowBanner,
  useUpdaterState,
  useUpdaterStore,
} from '../state/useUpdater';
import { useTheme } from '../contexts/ThemeContext';
import styles from './UpdaterBanner.module.css';

export interface UpdaterBannerProps {
  /** Optional callback fired when the user clicks "View details" — typically
   *  opens the Settings → Updates section so they see release notes and
   *  the install controls in context. */
  onOpenSettings?: () => void;
}

/**
 * UpdaterBanner — narrow strip that surfaces above the workspace when
 * a new version is available and the user hasn't dismissed it.
 *
 * Stays passive: the banner only announces availability. The actual
 * "Install update" CTA lives in Settings → Updates so users have the
 * context (version, release notes, current version readout) to make
 * an informed decision. Clicking "View details" routes there;
 * clicking "Later" hides the banner for the rest of the session.
 *
 * Hidden in the following states:
 *   - idle / checking / up-to-date / error  → nothing to surface
 *   - downloading / ready-to-install        → user is mid-flow, the
 *     Settings panel owns the progress + restart UI
 *   - any state when `bannerDismissed` is true
 */
export const UpdaterBanner: FC<UpdaterBannerProps> = ({ onOpenSettings }) => {
  const { theme } = useTheme();
  const visible = useUpdaterShouldShowBanner();
  const state = useUpdaterState();
  const dismiss = useUpdaterStore((s) => s.dismissBanner);

  if (!visible || state.kind !== 'available') return null;

  return (
    <div
      className={styles.banner}
      role="status"
      aria-live="polite"
      aria-label={`Hyperspanner version ${state.version} is available`}
    >
      <span
        className={styles.indicator}
        style={{ backgroundColor: theme.colors.orange }}
        aria-hidden="true"
      />
      <span className={styles.text}>
        <strong>Hyperspanner v{state.version}</strong> is available.
      </span>
      <div className={styles.actions}>
        <LcarsPill
          size="small"
          onClick={onOpenSettings}
          aria-label="View update details in settings"
        >
          View details
        </LcarsPill>
        <LcarsPill
          size="small"
          onClick={dismiss}
          aria-label="Dismiss update notification for this session"
        >
          Later
        </LcarsPill>
      </div>
    </div>
  );
};
