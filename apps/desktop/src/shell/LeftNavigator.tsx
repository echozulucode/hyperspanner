import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { LcarsPill, LcarsSearchField } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import { listToolsByCategory, type ToolCategory, type ToolDescriptor } from '../tools';
import styles from './LeftNavigator.module.css';

export interface LeftNavigatorProps {
  /** Id of the tool currently visible to the user (active in its zone). */
  activeToolId?: string | null;
  /** Ids of every open tool — shown with an "open" indicator in the tree. */
  openToolIds?: ReadonlySet<string>;
  /** Pinned favorite tool ids. Defaults to a small built-in set for Phase 3. */
  favoriteIds?: readonly string[];
  onOpenTool?: (toolId: string) => void;
}

interface NavCategory {
  id: ToolCategory;
  label: string;
  tools: ToolDescriptor[];
}

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  text: 'Text & Format',
  validation: 'Validation',
  data: 'Data & Encoding',
  binary: 'Binary',
  network: 'Network',
  utilities: 'Utilities',
};

const DEFAULT_FAVORITES: readonly string[] = ['json-validator', 'hash-workbench'];

export const LeftNavigator: FC<LeftNavigatorProps> = ({
  activeToolId,
  openToolIds,
  favoriteIds = DEFAULT_FAVORITES,
  onOpenTool,
}) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  // Categories start fully collapsed; an active filter query auto-expands matches.
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {},
  );

  const byCategory = useMemo(() => listToolsByCategory(), []);

  const categories: NavCategory[] = useMemo(
    () =>
      (Object.keys(CATEGORY_LABELS) as ToolCategory[])
        .map((id) => ({
          id,
          label: CATEGORY_LABELS[id],
          tools: byCategory[id],
        }))
        .filter((cat) => cat.tools.length > 0),
    [byCategory],
  );

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        tools: cat.tools.filter(
          (t) =>
            t.name.toLowerCase().includes(needle) ||
            t.id.toLowerCase().includes(needle) ||
            t.description.toLowerCase().includes(needle),
        ),
      }))
      .filter((cat) => cat.tools.length > 0);
  }, [query, categories]);

  const favorites = useMemo(() => {
    return favoriteIds
      .map((id) => Object.values(byCategory).flat().find((t) => t.id === id))
      .filter((t): t is ToolDescriptor => Boolean(t));
  }, [favoriteIds, byCategory]);

  const isOpen = (id: string) => openToolIds?.has(id) ?? false;

  return (
    <nav className={styles.nav} aria-label="Tool navigator">
      <div className={styles.elbowCap} aria-hidden="true" />

      <div className={styles.header}>
        <span className={styles.wordmark}>Hyperspanner</span>
        <span className={styles.wordmarkSub}>Starfleet Ops · v0.0</span>
      </div>

      <div className={styles.search}>
        <LcarsSearchField
          value={query}
          onChange={setQuery}
          prefix="FIND"
          placeholder="Filter tools…"
          aria-label="Filter tools"
        />
      </div>

      <div className={styles.sectionHeader}>
        <span>Favorites</span>
        <span className={styles.sectionCount}>{favorites.length}</span>
      </div>
      <div className={styles.pillList}>
        {favorites.map((tool) => (
          <div key={tool.id} className={styles.pillListRow}>
            <LcarsPill
              size="small"
              rounded="both"
              color={theme.colors.butterscotch}
              active={tool.id === activeToolId}
              onClick={() => onOpenTool?.(tool.id)}
              aria-label={tool.name}
            >
              <span>{tool.name}</span>
              {isOpen(tool.id) && (
                <span className={styles.openDot} aria-hidden="true" />
              )}
            </LcarsPill>
          </div>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <span>Categories</span>
        <span className={styles.sectionCount}>{filtered.length}</span>
      </div>
      <div className={styles.accordion}>
        {filtered.map((cat) => {
          const expanded = openCategories[cat.id] ?? Boolean(query);
          return (
            <div
              key={cat.id}
              className={`${styles.accordionItem} ${expanded ? styles.accordionOpen : ''}`}
            >
              <button
                type="button"
                className={styles.accordionHeader}
                aria-expanded={expanded}
                aria-controls={`nav-cat-${cat.id}`}
                onClick={() => toggleCategory(cat.id)}
              >
                <span>{cat.label}</span>
                <span className={styles.accordionChevron} aria-hidden="true">
                  ›
                </span>
              </button>
              {expanded && (
                <div id={`nav-cat-${cat.id}`} className={styles.accordionItems}>
                  {cat.tools.map((tool) => (
                    <div key={tool.id} className={styles.pillListRow}>
                      <LcarsPill
                        size="small"
                        rounded="both"
                        color={theme.colors.africanViolet}
                        active={tool.id === activeToolId}
                        onClick={() => onOpenTool?.(tool.id)}
                        aria-label={tool.name}
                      >
                        <span>{tool.name}</span>
                        {isOpen(tool.id) && (
                          <span className={styles.openDot} aria-hidden="true" />
                        )}
                      </LcarsPill>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.elbowCapBottom} aria-hidden="true" />
    </nav>
  );
};
