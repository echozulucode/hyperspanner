import { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { ToolFrame, ToolStatusPill } from '../components';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeName } from '../../themes';
import {
  useUpdaterState,
  useUpdaterStore,
} from '../../state/useUpdater';
import styles from './SystemSettings.module.css';

export interface SystemSettingsProps {
  toolId: string;
  zone?: Zone;
}

const THEME_OPTIONS: ReadonlyArray<{
  id: ThemeName;
  label: string;
  description: string;
}> = [
  {
    id: 'picard-modern',
    label: 'Picard · Modern',
    description: 'Charcoal + muted salmon. Default productivity palette.',
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'High-contrast LCARS reference colors.',
  },
  {
    id: 'nemesis-blue',
    label: 'Nemesis · Blue',
    description: 'Cool blue reframe of the rail/elbow palette.',
  },
  {
    id: 'lower-decks',
    label: 'Lower Decks',
    description: 'Bright, saturated, animation-style variant.',
  },
];

/**
 * SystemSettings — the application Settings view, surfaced as a tool
 * (id `system-settings`) so it docks like everything else and benefits
 * from the same zone / single-instance machinery.
 *
 * Phase 7 stub scope: just the Appearance section (theme picker), which
 * is what migrated out of the top-rail when the nav cluster was trimmed
 * down. Phase 8 expands this view with Layout, Keyboard, Diagnostics,
 * Data, and External Integrations sections per plan-002 §Phase 8.
 *
 * Why a tool rather than a separate route: the `system-` prefix on the
 * id flags it as a system surface (vs. user-level developer tooling)
 * but the workspace machinery — zones, single-instance focus,
 * `useTool` per-instance state — is the same. Surfacing settings as a
 * tool means the existing tab-strip, keyboard-shortcut, and
 * command-palette plumbing all "just work" without a dedicated
 * route hierarchy. Plan-002 §Phase 8 explicitly recommends this
 * pattern.
 */
export const SystemSettings: FC<SystemSettingsProps> = ({ toolId, zone }) => {
  const { theme, themeName, setTheme } = useTheme();
  const isCompact = zone === 'right' || zone === 'bottom';

  // Updates section state. Subscribed narrowly so unrelated workspace
  // updates don't re-render the whole settings tree.
  const updaterState = useUpdaterState();
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);
  const installUpdate = useUpdaterStore((s) => s.installUpdate);
  const relaunchAfterInstall = useUpdaterStore((s) => s.relaunchAfterInstall);

  // Resolve the running app version via Tauri's `getVersion()`. It
  // reads from `tauri.conf.json` at runtime so the value always
  // matches what's actually packaged. Lazy-loaded so jsdom-based tests
  // don't try to invoke a non-existent Tauri runtime; the import
  // promise resolves to an empty string on failure (e.g., in tests).
  const [appVersion, setAppVersion] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        const v = await getVersion();
        if (!cancelled) setAppVersion(v);
      } catch {
        // No Tauri runtime — leave the version blank.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectTheme = useCallback(
    (next: ThemeName) => {
      if (next !== themeName) setTheme(next);
    },
    [themeName, setTheme],
  );

  const status = (
    <ToolStatusPill status="ok" detail={`theme · ${themeName}`}>
      Settings
    </ToolStatusPill>
  );

  return (
    <ToolFrame
      toolId={toolId}
      title="Settings"
      subtitle="Appearance, layout defaults, and other application-wide preferences."
      zone={zone}
      status={status}
    >
      <div className={`${styles.container} ${isCompact ? styles.containerCompact : ''}`}>
        <section
          className={styles.section}
          aria-labelledby={`${toolId}-appearance-hd`}
        >
          <h3 id={`${toolId}-appearance-hd`} className={styles.sectionLabel}>
            Appearance
          </h3>
          <p className={styles.sectionLead}>
            Theme variants change the LCARS color scheme across the app.
            Selecting a theme applies it immediately.
          </p>
          <div className={styles.themeGrid}>
            {THEME_OPTIONS.map((option) => {
              const isActive = option.id === themeName;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.themeCard} ${
                    isActive ? styles.themeCardActive : ''
                  }`}
                  onClick={() => handleSelectTheme(option.id)}
                  aria-label={`Select ${option.label} theme${
                    isActive ? ' (currently active)' : ''
                  }`}
                  aria-pressed={isActive}
                >
                  <span
                    className={styles.themeAccent}
                    style={{ backgroundColor: theme.colors.lilac }}
                  />
                  <span className={styles.themeBody}>
                    <span className={styles.themeName}>{option.label}</span>
                    <span className={styles.themeDesc}>{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className={styles.section}
          aria-labelledby={`${toolId}-updates-hd`}
        >
          <h3 id={`${toolId}-updates-hd`} className={styles.sectionLabel}>
            Updates
          </h3>
          <p className={styles.sectionLead}>
            {import.meta.env.DEV ? (
              <>
                <strong>Auto-update disabled in development mode.</strong>{' '}
                The running build is from source and would perpetually
                trail the latest release; production builds re-enable
                the on-launch check. Use <em>Check now</em> below to
                test the updater flow manually.
              </>
            ) : (
              <>Hyperspanner checks for new releases on launch.</>
            )}{' '}
            {appVersion ? (
              <>
                You're running <strong>v{appVersion}</strong>.
              </>
            ) : (
              <>(Version unavailable in this environment.)</>
            )}
          </p>
          <UpdatesPanel
            updaterState={updaterState}
            onCheck={() => {
              void checkForUpdates();
            }}
            onInstall={() => {
              void installUpdate();
            }}
            onRelaunch={() => {
              void relaunchAfterInstall();
            }}
          />
        </section>

        <section className={styles.section} aria-label="Phase 8 preview">
          <h3 className={styles.sectionLabel}>Coming soon</h3>
          <ul className={styles.previewList}>
            <li>Layout — default startup tools, default preset, side widths.</li>
            <li>Keyboard — rebindable shortcuts.</li>
            <li>Data — import / export workspace, custom presets.</li>
            <li>
              Diagnostics — log directory, recent errors, telemetry opt-in.
            </li>
            <li>External integrations — clipboard, drag-and-drop policy.</li>
          </ul>
          <div className={styles.previewActions}>
            <LcarsPill size="small" disabled aria-label="Phase 8 (placeholder)">
              Phase 8
            </LcarsPill>
          </div>
        </section>
      </div>
    </ToolFrame>
  );
};

interface UpdatesPanelProps {
  updaterState: ReturnType<typeof useUpdaterState>;
  onCheck: () => void;
  onInstall: () => void;
  onRelaunch: () => void;
}

/**
 * UpdatesPanel — renders the right copy + controls for whatever
 * updater state we're in. Pulled out as its own component so the
 * SystemSettings body stays readable; the state machine has more
 * branches than fit cleanly in JSX inline.
 */
const UpdatesPanel: FC<UpdatesPanelProps> = ({
  updaterState,
  onCheck,
  onInstall,
  onRelaunch,
}) => {
  switch (updaterState.kind) {
    case 'idle':
    case 'up-to-date':
      return (
        <div className={styles.updatesRow}>
          <span className={styles.updatesText}>
            {updaterState.kind === 'up-to-date'
              ? "You're on the latest version."
              : 'No update check has run yet.'}
          </span>
          <LcarsPill size="small" onClick={onCheck} aria-label="Check for updates">
            Check now
          </LcarsPill>
        </div>
      );
    case 'checking':
      return (
        <div className={styles.updatesRow}>
          <span className={styles.updatesText}>Checking for updates…</span>
          <LcarsPill size="small" disabled aria-label="Check in progress">
            Checking…
          </LcarsPill>
        </div>
      );
    case 'available':
      return (
        <div className={styles.updatesAvailable}>
          <div className={styles.updatesRow}>
            <span className={styles.updatesText}>
              <strong>v{updaterState.version}</strong> is available.
            </span>
            <LcarsPill
              size="small"
              onClick={onInstall}
              aria-label={`Install version ${updaterState.version}`}
            >
              Install update
            </LcarsPill>
          </div>
          {updaterState.notes ? (
            <pre className={styles.releaseNotes} aria-label="Release notes">
              {updaterState.notes}
            </pre>
          ) : null}
        </div>
      );
    case 'downloading':
      return (
        <div className={styles.updatesRow}>
          <span className={styles.updatesText}>
            Downloading v{updaterState.version}
            {updaterState.progress !== null
              ? ` — ${Math.round(updaterState.progress)}%`
              : '…'}
          </span>
          <progress
            className={styles.progressBar}
            value={updaterState.progress ?? undefined}
            max={100}
            aria-label="Download progress"
          />
        </div>
      );
    case 'ready-to-install':
      return (
        <div className={styles.updatesRow}>
          <span className={styles.updatesText}>
            v{updaterState.version} is ready. Restart to apply.
          </span>
          <LcarsPill
            size="small"
            onClick={onRelaunch}
            aria-label="Restart now to install update"
          >
            Restart now
          </LcarsPill>
        </div>
      );
    case 'error':
      return (
        <div className={styles.updatesRow}>
          <span className={styles.updatesText}>
            Update check unavailable. {updaterState.message}
          </span>
          <LcarsPill size="small" onClick={onCheck} aria-label="Retry update check">
            Retry
          </LcarsPill>
        </div>
      );
  }
};
