import { useEffect } from 'react';

/**
 * useShellShortcuts — keyboard shortcuts for zone visibility.
 *
 * Phase 2 owned its own state via a local hook. Phase 3 hoisted zone collapse
 * into the workspace Zustand store, so this hook is now just a shortcut
 * registrar — it calls the provided toggle callback for the matching zone.
 *
 * Shortcuts (ignored while typing):
 *   Cmd/Ctrl+B          → toggle Left (navigator)
 *   Cmd/Ctrl+J          → toggle Bottom (console)
 *   Cmd/Ctrl+Shift+E    → toggle Right (inspector)
 */

export type ShortcutZone = 'left' | 'right' | 'bottom';

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}

export function useShellShortcuts(
  onToggle: (zone: ShortcutZone) => void,
): void {
  useEffect(() => {
    const mac = isMac();
    const handler = (event: KeyboardEvent) => {
      const mod = mac ? event.metaKey : event.ctrlKey;
      if (!mod) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'b' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        onToggle('left');
      } else if (key === 'j' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        onToggle('bottom');
      } else if (key === 'e' && event.shiftKey && !event.altKey) {
        event.preventDefault();
        onToggle('right');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggle]);
}
