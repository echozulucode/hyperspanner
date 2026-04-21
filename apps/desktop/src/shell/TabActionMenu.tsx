import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Zone } from '../state';
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

type EntryId =
  | 'focus'
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
export const TabActionMenu: FC<TabActionMenuProps> = ({
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
}) => {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const entries: Entry[] = [
    { id: 'focus', label: 'Focus' },
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

  // Click outside → close.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset cursor when opening.
  useEffect(() => {
    if (open) setCursor(0);
  }, [open]);

  const dispatch = useCallback(
    (id: EntryId) => {
      setOpen(false);
      switch (id) {
        case 'focus':
          onFocus(toolId);
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
    [toolId, onFocus, onMove, onSplit, onMerge, onMaximize, onResetLayout, onClose],
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

  const handleKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
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

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onKeyDown={handleKey}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tab actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        ⋮
      </button>

      {open && (
        <ul
          ref={listRef}
          role="menu"
          className={styles.menu}
          onClick={(e) => e.stopPropagation()}
        >
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
        </ul>
      )}
    </div>
  );
};
