import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { LcarsPill, LcarsSearchField } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import styles from './LeftNavigator.module.css';

interface NavTool {
  id: string;
  label: string;
}

interface NavCategory {
  id: string;
  label: string;
  tools: NavTool[];
}

export interface LeftNavigatorProps {
  activeToolId?: string;
  onOpenTool?: (toolId: string) => void;
}

// Placeholder registry until Phase 4 lands the real one.
const CATEGORIES: NavCategory[] = [
  {
    id: 'text',
    label: 'Text & Format',
    tools: [
      { id: 'text-diff', label: 'Text Diff' },
      { id: 'case-transform', label: 'Case Transform' },
      { id: 'whitespace-clean', label: 'Whitespace Clean' },
    ],
  },
  {
    id: 'validation',
    label: 'Validation',
    tools: [
      { id: 'json-validator', label: 'JSON Validator' },
      { id: 'yaml-validator', label: 'YAML Validator' },
      { id: 'regex-tester', label: 'Regex Tester' },
    ],
  },
  {
    id: 'data',
    label: 'Data & Encoding',
    tools: [
      { id: 'hash-workbench', label: 'Hash Workbench' },
      { id: 'base64-pad', label: 'Base64 Pad' },
      { id: 'url-codec', label: 'URL Codec' },
    ],
  },
  {
    id: 'binary',
    label: 'Binary',
    tools: [
      { id: 'hex-inspector', label: 'Hex Inspector' },
      { id: 'protobuf-decode', label: 'Protobuf Decode' },
    ],
  },
  {
    id: 'network',
    label: 'Network',
    tools: [
      { id: 'cidr-calc', label: 'CIDR Calculator' },
      { id: 'tls-inspector', label: 'TLS Inspector' },
    ],
  },
];

const FAVORITES: NavTool[] = [
  { id: 'json-validator', label: 'JSON Validator' },
  { id: 'hash-workbench', label: 'Hash Workbench' },
];

export const LeftNavigator: FC<LeftNavigatorProps> = ({ activeToolId, onOpenTool }) => {
  const { theme } = useTheme();

  const [query, setQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    text: true,
    validation: true,
  });

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      tools: cat.tools.filter(
        (t) =>
          t.label.toLowerCase().includes(needle) || t.id.toLowerCase().includes(needle),
      ),
    })).filter((cat) => cat.tools.length > 0);
  }, [query]);

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
        <span className={styles.sectionCount}>{FAVORITES.length}</span>
      </div>
      <div className={styles.pillList}>
        {FAVORITES.map((tool) => (
          <div key={tool.id} className={styles.pillListRow}>
            <LcarsPill
              size="small"
              rounded="both"
              color={theme.colors.butterscotch}
              active={tool.id === activeToolId}
              onClick={() => onOpenTool?.(tool.id)}
              aria-label={tool.label}
            >
              <span>{tool.label}</span>
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
          const isOpen = openCategories[cat.id] ?? Boolean(query);
          return (
            <div
              key={cat.id}
              className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}
            >
              <button
                type="button"
                className={styles.accordionHeader}
                aria-expanded={isOpen}
                aria-controls={`nav-cat-${cat.id}`}
                onClick={() => toggleCategory(cat.id)}
              >
                <span>{cat.label}</span>
                <span className={styles.accordionChevron} aria-hidden="true">
                  ›
                </span>
              </button>
              {isOpen && (
                <div id={`nav-cat-${cat.id}`} className={styles.accordionItems}>
                  {cat.tools.map((tool) => (
                    <div key={tool.id} className={styles.pillListRow}>
                      <LcarsPill
                        size="small"
                        rounded="both"
                        color={theme.colors.africanViolet}
                        active={tool.id === activeToolId}
                        onClick={() => onOpenTool?.(tool.id)}
                        aria-label={tool.label}
                      >
                        <span>{tool.label}</span>
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
