import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FC, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { LcarsSearchField } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import { listTools, type ToolDescriptor } from '../tools';
import styles from './CommandPalette.module.css';

/**
 * CommandItem — unified entry in the palette.
 *
 * Both tools and global actions (reset layout, theme switch, etc.) share
 * this shape so the filter + render + execute plumbing stays uniform. A
 * `kind` tag lets the UI tell them apart visually (eyebrow label, color),
 * and the palette never has to special-case action vs tool past the
 * initial item construction.
 */
export interface CommandItem {
  id: string;
  label: string;
  /** Short description — shown dimly under the label. */
  description?: string;
  /** Group label shown in the right gutter ("TOOL", "ACTION", etc.). */
  kind: 'tool' | 'action';
  /** Keywords joined into the filter haystack for scoring. */
  keywords?: string[];
  /** Run when the user activates this item. Palette closes after. */
  run: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Open a tool by id — wired to AppShell's handleOpenTool. */
  onOpenTool: (toolId: string) => void;
  /** Reset the workspace layout — surfaced as the "Reset Layout" action. */
  onResetLayout?: () => void;
  /** Cycle theme — surfaced as the "Cycle Theme" action. */
  onCycleTheme?: () => void;
}

/**
 * CommandPalette — ⌘K modal for launching tools and running global actions.
 *
 * Rendered as a fixed portal over the top of the app when `open` is true.
 * Arrow keys move selection, Enter executes, Escape closes, click-outside
 * closes. Fuzzy-ish filter: prefix / substring match against label,
 * description, and explicit keywords.
 *
 * Why portal + fixed positioning rather than an in-flow drawer: the palette
 * needs to escape the LCARS layout's overflow clips (the center zone
 * clips, the rail clips, etc.) and sit over everything. Portaling to
 * document.body is the one reliable way to do that without fighting each
 * ancestor's overflow rule individually.
 *
 * Phase 6+ will expand the actions list (toggle inspector, focus tab, go
 * to home, etc.). The shape of `CommandItem` is intentionally small so
 * extending it doesn't require touching the palette's render layer.
 */
export const CommandPalette: FC<CommandPaletteProps> = ({
  open,
  onClose,
  onOpenTool,
  onResetLayout,
  onCycleTheme,
}) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Build the command catalog. Tools first, actions at the end — actions
  // are rare enough that burying them below tools keeps the default "open
  // palette and start typing a tool name" flow frictionless.
  const catalog: CommandItem[] = useMemo(() => {
    const toolItems: CommandItem[] = listTools().map((tool: ToolDescriptor) => ({
      id: `tool:${tool.id}`,
      label: tool.name,
      description: tool.description,
      kind: 'tool',
      keywords: [tool.category, tool.id],
      run: () => onOpenTool(tool.id),
    }));

    const actions: CommandItem[] = [];
    if (onResetLayout) {
      actions.push({
        id: 'action:reset-layout',
        label: 'Reset Layout',
        description: 'Restore the workspace to its default split/zone layout.',
        kind: 'action',
        keywords: ['layout', 'workspace', 'default'],
        run: onResetLayout,
      });
    }
    if (onCycleTheme) {
      actions.push({
        id: 'action:cycle-theme',
        label: 'Cycle Theme',
        description: 'Switch to the next LCARS theme variant.',
        kind: 'action',
        keywords: ['theme', 'color', 'skin'],
        run: onCycleTheme,
      });
    }

    return [...toolItems, ...actions];
  }, [onOpenTool, onResetLayout, onCycleTheme]);

  // Score + filter. Prefix-label matches come first, then label-substring,
  // then keyword hits, then description hits. Ties broken by label order.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    const score = (item: CommandItem): number => {
      const label = item.label.toLowerCase();
      const desc = (item.description ?? '').toLowerCase();
      const kw = (item.keywords ?? []).join(' ').toLowerCase();
      if (label.startsWith(q)) return 0;
      if (label.includes(q)) return 1;
      if (kw.includes(q)) return 2;
      if (desc.includes(q)) return 3;
      return 99;
    };
    return catalog
      .map((item) => ({ item, s: score(item) }))
      .filter(({ s }) => s < 99)
      .sort((a, b) => a.s - b.s || a.item.label.localeCompare(b.item.label))
      .map(({ item }) => item);
  }, [query, catalog]);

  // Reset query + cursor whenever the palette opens. Without this, the
  // user's last-typed filter would persist between opens and the first
  // keystroke would append to it — surprising.
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
    }
  }, [open]);

  // Clamp cursor so it doesn't point past a shorter filtered list.
  useEffect(() => {
    if (cursor >= results.length) {
      setCursor(results.length > 0 ? results.length - 1 : 0);
    }
  }, [results.length, cursor]);

  // Auto-focus the input when the palette opens. Done with a microtask
  // delay so the portaled DOM exists by the time we call focus().
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Click-outside → close. Inside check uses the rootRef which wraps both
  // the search field and the list (they live in the same portal root).
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  // Scroll the selected row into view when the cursor moves past the edge
  // of the visible list. Small niceness — without it, arrow-down past the
  // eighth item lands off-screen.
  useEffect(() => {
    if (!listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(
      `[data-cursor="${cursor}"]`,
    );
    row?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const executeCurrent = useCallback(() => {
    const item = results[cursor];
    if (!item) return;
    item.run();
    onClose();
  }, [results, cursor, onClose]);

  const handleKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setCursor((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setCursor((prev) =>
          results.length === 0 ? 0 : (prev - 1 + results.length) % results.length,
        );
        break;
      case 'Home':
        event.preventDefault();
        setCursor(0);
        break;
      case 'End':
        event.preventDefault();
        setCursor(Math.max(0, results.length - 1));
        break;
      case 'Enter':
        event.preventDefault();
        executeCurrent();
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const accent = theme.colors.orange;

  return createPortal(
    <div className={styles.scrim} role="presentation" aria-hidden={!open}>
      <div
        ref={rootRef}
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKey}
      >
        <div className={styles.searchSlot} style={{ borderColor: accent }}>
          <LcarsSearchField
            ref={inputRef}
            value={query}
            onChange={setQuery}
            prefix="CMD"
            placeholder="Type a tool or action…"
            shortcut="ESC"
            onCancel={onClose}
            onSubmit={() => executeCurrent()}
            className={styles.searchField}
          />
        </div>

        {results.length === 0 ? (
          <div className={styles.empty}>No matches.</div>
        ) : (
          <ul ref={listRef} className={styles.list} role="listbox">
            {results.map((item, index) => {
              const isActive = index === cursor;
              return (
                <li
                  key={item.id}
                  data-cursor={index}
                  role="option"
                  aria-selected={isActive}
                  className={[
                    styles.row,
                    isActive ? styles.rowActive : '',
                    item.kind === 'action' ? styles.rowAction : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setCursor(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setCursor(index);
                    item.run();
                    onClose();
                  }}
                >
                  <span
                    className={styles.rowAccent}
                    style={{
                      backgroundColor:
                        item.kind === 'action'
                          ? theme.colors.africanViolet
                          : accent,
                    }}
                    aria-hidden="true"
                  />
                  <span className={styles.rowBody}>
                    <span className={styles.rowLabel}>{item.label}</span>
                    {item.description && (
                      <span className={styles.rowDesc}>{item.description}</span>
                    )}
                  </span>
                  <span className={styles.rowKind} aria-hidden="true">
                    {item.kind === 'action' ? 'ACTION' : 'TOOL'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className={styles.footer} aria-hidden="true">
          <span>↑↓ navigate</span>
          <span>↵ execute</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};
