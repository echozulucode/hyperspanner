import { useEffect, useRef } from 'react';
import { isMacPlatform, type Shortcut } from './shortcuts';

/**
 * useGlobalShortcuts — install a list of global keyboard bindings.
 *
 * Each binding carries its own "fire while typing?" policy so we can mix
 * palette-style shortcuts (allow typing) with navigation shortcuts
 * (block typing) in a single registry without needing two hooks or a
 * bunch of ad-hoc `if` blocks in the caller.
 *
 * Bindings are captured in a ref so the effect's listener always sees
 * the latest list without needing to re-register on every render. This
 * matters because render-dependent shortcuts (e.g., palette open/close
 * whose `run` closes over `setPaletteOpen`) would otherwise subscribe
 * and unsubscribe constantly, occasionally missing keystrokes.
 */
export function useGlobalShortcuts(shortcuts: Shortcut[]): void {
  const ref = useRef(shortcuts);
  // Keep the ref in sync each render — cheaper than tearing down the
  // window listener. The listener reads through the ref at event time.
  ref.current = shortcuts;

  useEffect(() => {
    const mac = isMacPlatform();

    const isTypingTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      );
    };

    const handler = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target);
      const eventKey = event.key.toLowerCase();
      const mod = mac ? event.metaKey : event.ctrlKey;

      for (const s of ref.current) {
        const wantMod = Boolean(s.mod);
        const wantShift = Boolean(s.shift);
        const wantAlt = Boolean(s.alt);

        if (wantMod !== mod) continue;
        if (wantShift !== event.shiftKey) continue;
        if (wantAlt !== event.altKey) continue;

        // Key match is case-insensitive. Shortcut authors declare `key`
        // in lowercase; event.key.toLowerCase() does the rest. This
        // handles the "⇧ + / = ?" ambiguity on US layouts: a binding
        // on `key: '?'` matches because event.key for Shift+/ is '?'.
        if (eventKey !== s.key.toLowerCase()) continue;

        const policy = s.whenTyping ?? 'block';
        if (typing && policy === 'block') continue;

        event.preventDefault();
        s.run();
        // First match wins — bindings are authored in priority order.
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
