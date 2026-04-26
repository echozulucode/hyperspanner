// LeftNavigator — rail-mounted tool navigator with search + favorites +
// recents + categorized browse. Rebuilt in Phase 4 of plan-002.
import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { LcarsPanel, LcarsSearchField } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import { listTools, listToolsByCategory, type ToolCategory, type ToolDescriptor } from '../tools';
import { useFavorites, useRecents } from '../state';
import styles from './LeftNavigator.module.css';

export interface LeftNavigatorProps {
  /** Id of the tool currently visible to the user (active in its zone). */
  activeToolId?: string | null;
  /** Ids of every open tool — shown with an "open" indicator in the tree. */
  openToolIds?: ReadonlySet<string>;
  onOpenTool?: (toolId: string) => void;
  /**
   * The rail's own color — the LcarsStandardLayout's leftFrame background
   * color. We use this for the FIRST category panel so the visual
   * transition from the decorative rail curve area into the panel stack
   * is a color continuation rather than a hard seam.
   */
  railColor?: string;
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

/**
 * LeftNavigator — tool navigator rendered as a stack of LCARS rail panels.
 *
 * Lives inside LcarsStandardLayout's `bottomPanels` slot. The rail stack
 * always leads with a QUERY search field; below that, three conditional
 * regions:
 *
 *   1. Pinned  — tools the user has favorited (non-empty ⇒ shown, ordered
 *      most-recently-pinned-first by the favorites store).
 *   2. Recent  — tools the user has opened lately (non-empty ⇒ shown,
 *      capped by the recents store at RECENTS_CAP).
 *   3. Browse  — canonical category stack, collapsible in place.
 *
 * When a search query is typed, Pinned/Recent/Browse are replaced by a
 * flat "SEARCH RESULTS" section filtered by name + description. This keeps
 * the rail single-purpose in search mode: the user wants to find a tool,
 * not rediscover their workspace history while they do it.
 *
 * Why search/favorites/recents ended up IN the rail (despite the old
 * comment in this file saying they didn't compose cleanly): once we give
 * the stack its own scroll and pin the search field as a non-shrinking
 * flex child, LcarsPanel composes fine as the section-header grammar,
 * and the rail becomes the single entry point for tool launching —
 * matching LCARS's "everything framed by the rail" affordance and
 * removing the need for a separate overlay or top-nav search.
 */
export const LeftNavigator: FC<LeftNavigatorProps> = ({
  activeToolId,
  openToolIds,
  onOpenTool,
  railColor,
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const favorites = useFavorites();
  const recents = useRecents();

  const byCategory = useMemo(() => listToolsByCategory(), []);
  // Hidden tools (system surfaces like Settings) are deliberately
  // excluded from the navigator entirely — both the browse-by-category
  // grid (via `listToolsByCategory`) and the search / favorites /
  // recents resolution paths below. Listing them here would clutter
  // the rail with surfaces the user already accesses via dedicated
  // top-rail pills. The command palette still surfaces hidden tools
  // by consuming `listTools()` directly.
  const allTools = useMemo(() => listTools().filter((t) => !t.hidden), []);
  const toolsById = useMemo(() => {
    const map = new Map<string, ToolDescriptor>();
    for (const t of allTools) map.set(t.id, t);
    return map;
  }, [allTools]);

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

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  // Flat search match — name prefix beats description prefix beats any
  // substring, because prefix hits are what the user usually means when
  // they type a couple of characters ("js" → JSON Validator first).
  const searchResults = useMemo(() => {
    if (!isSearching) return [] as ToolDescriptor[];
    const q = normalizedQuery;
    const score = (t: ToolDescriptor): number => {
      const name = t.name.toLowerCase();
      const desc = t.description.toLowerCase();
      if (name.startsWith(q)) return 0;
      if (name.includes(q)) return 1;
      if (desc.startsWith(q)) return 2;
      if (desc.includes(q)) return 3;
      return 99;
    };
    return allTools
      .map((t) => ({ tool: t, s: score(t) }))
      .filter(({ s }) => s < 99)
      .sort((a, b) => a.s - b.s || a.tool.name.localeCompare(b.tool.name))
      .map(({ tool }) => tool);
  }, [isSearching, normalizedQuery, allTools]);

  const pinnedTools = useMemo(() => {
    if (isSearching) return [] as ToolDescriptor[];
    return favorites
      .map((id) => toolsById.get(id))
      .filter((t): t is ToolDescriptor => Boolean(t));
  }, [favorites, toolsById, isSearching]);

  const recentTools = useMemo(() => {
    if (isSearching) return [] as ToolDescriptor[];
    return recents
      .map((id) => toolsById.get(id))
      // Don't re-list pinned tools in recents — the user already has them.
      .filter((t): t is ToolDescriptor => Boolean(t) && !favorites.includes(t!.id));
  }, [recents, toolsById, favorites, isSearching]);

  const toggleCategory = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isOpen = (id: string) => openToolIds?.has(id) ?? false;

  // Palette cycles through canonical LCARS hues so the category stack
  // reads as a "varied segmented bar" (S4 pattern). The FIRST color is
  // railColor so the handoff from the decorative rail curve (which is
  // painted in railColor by the layout primitive) into the first panel
  // is a color continuation, not a seam.
  const palette = [
    railColor ?? theme.colors.africanViolet,
    theme.colors.butterscotch,
    theme.colors.bluey,
    theme.colors.orange,
    theme.colors.lilac,
    theme.colors.peach,
  ];

  // Dedicated hues for the meta-sections — chosen so each reads as a
  // distinct section while harmonizing with the rail palette.
  //   - pinned  → butterscotch (warm, attention-grabbing for "you marked these")
  //   - recent  → bluey        (cool, neutral, historical)
  //   - search  → red          (signals "active filter — your normal stack is hidden")
  const pinnedColor = theme.colors.butterscotch;
  const recentColor = theme.colors.bluey;
  const searchColor = theme.colors.red;

  const renderToolPanel = (tool: ToolDescriptor, color: string) => (
    <LcarsPanel
      key={tool.id}
      color={color}
      height="2rem"
      active={tool.id === activeToolId}
      onClick={() => onOpenTool?.(tool.id)}
      className={styles.toolPanel}
    >
      <span className={styles.toolLabel}>
        {tool.name}
        {isOpen(tool.id) && (
          <span className={styles.openDot} aria-hidden="true" />
        )}
      </span>
    </LcarsPanel>
  );

  return (
    <div className={styles.stack} role="navigation" aria-label="Tool navigator">
      <div className={styles.searchSlot}>
        <LcarsSearchField
          value={query}
          onChange={setQuery}
          prefix="FIND"
          placeholder="Filter tools…"
          aria-label="Filter tools by name"
          onCancel={() => setQuery('')}
          className={styles.searchField}
        />
      </div>

      {isSearching ? (
        <div className={styles.categoryBlock}>
          <LcarsPanel
            color={searchColor}
            height="2.25rem"
            active
            className={styles.sectionHeader}
          >
            {`RESULTS · ${searchResults.length}`}
          </LcarsPanel>
          {searchResults.length > 0 ? (
            <div
              className={styles.categoryItems}
              role="group"
              aria-label="Search results"
            >
              {searchResults.map((tool) => renderToolPanel(tool, searchColor))}
            </div>
          ) : (
            <div className={styles.emptyHint} role="status">
              No tools match "{query}".
            </div>
          )}
        </div>
      ) : (
        <>
          {pinnedTools.length > 0 && (
            <div className={styles.categoryBlock}>
              <LcarsPanel
                color={pinnedColor}
                height="2.25rem"
                className={styles.sectionHeader}
              >
                PINNED
              </LcarsPanel>
              <div
                className={styles.categoryItems}
                role="group"
                aria-label="Pinned tools"
              >
                {pinnedTools.map((tool) => renderToolPanel(tool, pinnedColor))}
              </div>
            </div>
          )}

          {recentTools.length > 0 && (
            <div className={styles.categoryBlock}>
              <LcarsPanel
                color={recentColor}
                height="2.25rem"
                className={styles.sectionHeader}
              >
                RECENT
              </LcarsPanel>
              <div
                className={styles.categoryItems}
                role="group"
                aria-label="Recent tools"
              >
                {recentTools.map((tool) => renderToolPanel(tool, recentColor))}
              </div>
            </div>
          )}

          {categories.map((cat, index) => {
            const isExpanded = Boolean(expanded[cat.id]);
            const panelColor = palette[index % palette.length];
            return (
              <div key={cat.id} className={styles.categoryBlock}>
                <LcarsPanel
                  color={panelColor}
                  height="2.75rem"
                  active={isExpanded}
                  onClick={() => toggleCategory(cat.id)}
                  className={styles.categoryPanel}
                >
                  {cat.label}
                </LcarsPanel>
                {isExpanded && (
                  <div
                    className={styles.categoryItems}
                    role="group"
                    aria-label={cat.label}
                  >
                    {cat.tools.map((tool) => renderToolPanel(tool, panelColor))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
