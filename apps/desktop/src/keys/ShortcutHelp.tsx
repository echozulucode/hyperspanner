import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FC } from 'react';
import styles from './ShortcutHelp.module.css';
import { formatShortcut, isMacPlatform, type Shortcut } from './shortcuts';

export interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

/**
 * HELP_CATALOG — the canonical shortcut list shown in the help overlay.
 *
 * This is separate from the bindings array installed via
 * useGlobalShortcuts so that (a) the overlay can show documentation for
 * shortcuts whose behavior lives across multiple handlers (zone toggles
 * live in useShellShortcuts, palette lives in useGlobalShortcuts) and
 * (b) re-ordering / grouping for presentation doesn't accidentally
 * rewire the actual bindings.
 *
 * A fancier system could derive the list from the registered bindings,
 * but that couples presentation to registration and gives up grouping
 * for free. Keeping this small and hand-written is the least surprising
 * path for a modest handful of shortcuts.
 */
const HELP_CATALOG: Array<{ group: string; entries: Shortcut[] }> = [
  {
    group: 'Global',
    entries: [
      {
        id: 'palette.open',
        description: 'Open the command palette',
        key: 'k',
        mod: true,
        run: () => {},
      },
      {
        id: 'shortcuts.help',
        description: 'Show this help',
        key: '?',
        shift: true,
        run: () => {},
      },
    ],
  },
  {
    group: 'Workspace',
    entries: [
      {
        id: 'zone.toggleLeft',
        description: 'Toggle navigator (left rail)',
        key: 'b',
        mod: true,
        run: () => {},
      },
      {
        id: 'zone.toggleBottom',
        description: 'Toggle console (bottom zone)',
        key: 'j',
        mod: true,
        run: () => {},
      },
      {
        id: 'zone.toggleRight',
        description: 'Toggle inspector (right zone)',
        key: 'e',
        mod: true,
        shift: true,
        run: () => {},
      },
    ],
  },
];

/**
 * ShortcutHelp — modal overlay listing the app's global shortcuts.
 *
 * Triggered by ⇧+? via useGlobalShortcuts. Esc closes. The list is a
 * static catalog (see HELP_CATALOG) rather than a live view of installed
 * bindings — static is fine because the shortcut set is small and
 * decoupling presentation from registration makes grouping easier.
 */
export const ShortcutHelp: FC<ShortcutHelpProps> = ({ open, onClose }) => {
  const isMac = isMacPlatform();

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.scrim}
      role="presentation"
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>HELP · SHORTCUTS</span>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className={styles.groups}>
          {HELP_CATALOG.map((group) => (
            <section key={group.group} className={styles.group}>
              <h3 className={styles.groupLabel}>{group.group}</h3>
              <ul className={styles.list}>
                {group.entries.map((entry) => (
                  <li key={entry.id} className={styles.row}>
                    <span className={styles.label}>{entry.description}</span>
                    <kbd className={styles.keys}>{formatShortcut(entry, isMac)}</kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className={styles.footer}>
          <span>Esc to close</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
