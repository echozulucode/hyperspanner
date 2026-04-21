import { useCallback, useEffect, useState } from 'react';

/**
 * useZoneState — shell zone open/closed state + keyboard shortcuts.
 *
 * Temporary home for the open/collapsed state in Phase 2. Phase 3 migrates
 * this into the Zustand `workspace` store alongside docked tools.
 *
 * Defaults: Left open, Right open, Bottom closed.
 * Shortcuts: Cmd/Ctrl+B (Left), Cmd/Ctrl+Shift+E (Right), Cmd/Ctrl+J (Bottom).
 */

export type ShellZone = 'left' | 'right' | 'bottom';

export interface ShellZoneState {
  left: boolean;
  right: boolean;
  bottom: boolean;
}

const DEFAULT_STATE: ShellZoneState = {
  left: true,
  right: true,
  bottom: false,
};

export interface UseZoneStateReturn {
  open: ShellZoneState;
  toggle: (zone: ShellZone) => void;
  setOpen: (zone: ShellZone, value: boolean) => void;
  reset: () => void;
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}

export function useZoneState(initial?: Partial<ShellZoneState>): UseZoneStateReturn {
  const [open, setOpenState] = useState<ShellZoneState>({
    ...DEFAULT_STATE,
    ...initial,
  });

  const toggle = useCallback((zone: ShellZone) => {
    setOpenState((prev) => ({ ...prev, [zone]: !prev[zone] }));
  }, []);

  const setOpen = useCallback((zone: ShellZone, value: boolean) => {
    setOpenState((prev) => ({ ...prev, [zone]: value }));
  }, []);

  const reset = useCallback(() => {
    setOpenState({ ...DEFAULT_STATE, ...initial });
  }, [initial]);

  // Keyboard shortcuts
  useEffect(() => {
    const mac = isMac();
    const handler = (event: KeyboardEvent) => {
      const mod = mac ? event.metaKey : event.ctrlKey;
      if (!mod) return;

      // Ignore when typing in an input/textarea/contenteditable
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
        toggle('left');
      } else if (key === 'j' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        toggle('bottom');
      } else if (key === 'e' && event.shiftKey && !event.altKey) {
        event.preventDefault();
        toggle('right');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  return { open, toggle, setOpen, reset };
}
