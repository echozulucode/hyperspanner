import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Zone } from '../state';
import { useIsFavorite, useToggleFavorite } from '../state';
import styles from './TabActionMenu.module.css';

export interface TabActionMenuProps {
  /** Id of the tool this menu operates on. */
  toolId: string;
  /** Zone the tool is currently docked in. */
  currentZone: Zone;
  /** Whether the center is split (enables Split/Merge entries). */
  centerSplit: 'none' | 'horizontal' | 'vertical';
  onFocus: (id: string) => void;
  onMove: (id: string, zone: Zone) => void;
  onSplit: (direction: 'horizontal' | 'vertical') => void;
  onMerge: () => void;
  onMaximize: (id: string) => void;
  onResetLayout: () => void;
  onClose: (id: string) => void;
}

/**
 * Imperative handle exposed to parents — lets the tab wrapper open the
 * menu at arbitrary viewport coordinates (used for the right-click /
 * `contextmenu` path so the menu lands at the cursor instead of below
 * the `⋮` trigger).
 */
export interface TabActionMenuHandle {
  /** Open the menu anchored at the given viewport (clientX/clientY)
   *  point. The menu still clamps itself inside the viewport. */
  openAt: (x: number, y: number) => void;
}

type EntryId =
  | 'focus'
  | 'toggle-pin'
  | 'move-center'
  | 'move-right'
  | 'move-bottom'
  | 'split-h'
  | 'split-v'
  | 'merge'
  | 'maximize'
  | 'reset'
  | 'close';

interface Entry {
  id: EntryId;
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

/**
 * TabActionMenu — per-tab action dropdown.
 *
 * Opens on click of the "⋮" trigger. Arrow keys move selection, Enter
 * dispatches, Escape closes. Click-outside also closes.
 *
 * Style is minimal — a dark pill column with LCARS eyebrow labels.
 * Visual polish lands in Phase 9.
 */
export const TabActionMenu = forwardRef<TabActionMenuHandle, TabActionMenuProps>(
  function TabActionMenu(
    {
      toolId,
      currentZone,
      centerSplit,
      onFocus,
      onMove,
      onSplit,
      onMerge,
      onMaximize,
      onResetLayout,
      onClose,
    },
    forwardedRef,
  ) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  // Optional cursor-anchor used when the menu is opened via the imperative
  // `openAt(x, y)` handle (right-click path). When set, positioning code
  // anchors the menu at the cursor instead of below the ⋮ trigger.
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Expose `openAt(x, y)` to parents — the right-click handler in
  // PulsingTab calls this with the event's `clientX/Y` so the menu
  // appears at the cursor.
  useImperativeHandle(
    forwardedRef,
    () => ({
      openAt: (x: number, y: number) => {
        setAnchorPoint({ x, y });
        setOpen(true);
      },
    }),
    [],
  );

  // Whenever the menu closes, clear the anchor so the next open from the
  // ⋮ button reverts to trigger-based positioning.
  useEffect(() => {
    if (!open) setAnchorPoint(null);
  }, [open]);

  // Favorite state — sourced directly from the store so TabActionMenu owns
  // the pin/unpin affordance without AppShell / ZoneTabStrip having to
  // thread the state through. Menu rows live and die with the menu, so
  // keeping this local doesn't leak a subscription beyond the tab's life.
  const isFavorite = useIsFavorite(toolId);
  const toggleFavorite = useToggleFavorite();

  const entries: Entry[] = [
    { id: 'focus', label: 'Focus' },
    {
      id: 'toggle-pin',
      label: isFavorite ? 'Unpin from Rail' : 'Pin to Rail',
    },
    {
      id: 'move-center',
      label: 'Move to Center',
      disabled: currentZone === 'center',
    },
    {
      id: 'move-right',
      label: 'Move to Right',
      disabled: currentZone === 'right',
    },
    {
      id: 'move-bottom',
      label: 'Move to Bottom',
      disabled: currentZone === 'bottom',
    },
    {
      id: 'split-h',
      label: 'Split Center — Horizontal',
      disabled: currentZone !== 'center' || centerSplit === 'horizontal',
    },
    {
      id: 'split-v',
      label: 'Split Center — Vertical',
      disabled: currentZone !== 'center' || centerSplit === 'vertical',
    },
    {
      id: 'merge',
      label: 'Merge Center',
      disabled: centerSplit === 'none',
    },
    { id: 'maximize', label: 'Maximize' },
    { id: 'reset', label: 'Reset Layout' },
    { id: 'close', label: 'Close', variant: 'danger' },
  ];

  // Click outside → close. Click-outside checks both the trigger root AND
  // the portaled menu, so clicks inside the dropdown (which is outside
  // rootRef's DOM subtree) don't self-close.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset cursor when opening.
  useEffect(() => {
    if (open) setCursor(0);
  }, [open]);

  /** Position the portaled menu. `position: fixed` is measured in viewport
   *  coords so it escapes every ancestor `overflow` clip. Two anchor modes:
   *   - `anchorPoint` set (right-click path): pin the menu's top-left at
   *     the cursor, clamped inside the viewport.
   *   - `anchorPoint` null (⋮ click path): right-align the menu under the
   *     trigger, the original behavior.
   *  Recomputed on scroll/resize. */
  useLayoutEffect(() => {
    if (!open) return;
    const MENU_W = 240;
    const ESTIMATED_H = 320; // rough ceiling for clamp; menu is ~11 rows
    const GAP = 6;
    const recompute = () => {
      let left: number;
      let top: number;
      if (anchorPoint) {
        left = anchorPoint.x;
        top = anchorPoint.y;
      } else {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        left = rect.right - MENU_W;
        top = rect.bottom + GAP;
      }
      // Clamp inside the viewport — flip upward / leftward as needed so a
      // right-click near the right or bottom edge still shows the full menu.
      left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8));
      if (top + ESTIMATED_H > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - ESTIMATED_H - 8);
      }
      setMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        minWidth: `${MENU_W}px`,
      });
    };
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true); // capture — catches nested scrolls
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [open, anchorPoint]);

  const dispatch = useCallback(
    (id: EntryId) => {
      setOpen(false);
      switch (id) {
        case 'focus':
          onFocus(toolId);
          break;
        case 'toggle-pin':
          toggleFavorite(toolId);
          break;
        case 'move-center':
          onMove(toolId, 'center');
          break;
        case 'move-right':
          onMove(toolId, 'right');
          break;
        case 'move-bottom':
          onMove(toolId, 'bottom');
          break;
        case 'split-h':
          onSplit('horizontal');
          break;
        case 'split-v':
          onSplit('vertical');
          break;
        case 'merge':
          onMerge();
          break;
        case 'maximize':
          onMaximize(toolId);
          break;
        case 'reset':
          onResetLayout();
          break;
        case 'close':
          onClose(toolId);
          break;
      }
    },
    [
      toolId,
      onFocus,
      onMove,
      onSplit,
      onMerge,
      onMaximize,
      onResetLayout,
      onClose,
      toggleFavorite,
    ],
  );

  const advance = (delta: number) => {
    setCursor((prev) => {
      let next = prev;
      for (let i = 0; i < entries.length; i += 1) {
        next = (next + delta + entries.length) % entries.length;
        if (!entries[next].disabled) return next;
      }
      return prev;
    });
  };

  // Widened to HTMLElement because this handler is attached to both the
  // trigger wrapper <div> (rootRef) and the portaled menu <ul> (listRef).
  // React's synthetic KeyboardEvent is generic over the currentTarget's
  // element type, so binding to both requires the common-ancestor type.
  const handleKey = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!open) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        advance(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        advance(-1);
        break;
      case 'Home':
        event.preventDefault();
        setCursor(entries.findIndex((e) => !e.disabled));
        break;
      case 'End':
        event.preventDefault(); {
          const last = [...entries].reverse().findIndex((e) => !e.disabled);
          if (last >= 0) setCursor(entries.length - 1 - last);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault(); {
          const entry = entries[cursor];
          if (entry && !entry.disabled) dispatch(entry.id);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
    }
  };

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={listRef}
            role="menu"
            aria-label="Tab actions"
            className={styles.menu}
            style={menuStyle}
            onKeyDown={handleKey}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <li className={styles.menuHeader} aria-hidden="true">
              Tab Actions
            </li>
            {entries.map((entry, index) => (
              <li
                key={entry.id}
                role="menuitem"
                aria-disabled={entry.disabled || undefined}
                className={[
                  styles.item,
                  index === cursor ? styles.itemActive : '',
                  entry.disabled ? styles.itemDisabled : '',
                  entry.variant === 'danger' ? styles.itemDanger : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => !entry.disabled && setCursor(index)}
                onClick={() => {
                  if (entry.disabled) return;
                  dispatch(entry.id);
                }}
              >
                {entry.label}
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={styles.root} onKeyDown={handleKey}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tab actions menu"
        title="Tab actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        ⋮
      </button>
      {menu}
    </div>
  );
  }, // closes the inner `function TabActionMenu(...) {}` that was the
     // single argument to `forwardRef(...)`.
);
