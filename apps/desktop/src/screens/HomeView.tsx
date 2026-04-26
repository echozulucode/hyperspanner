import { useMemo } from 'react';
import type { FC } from 'react';
import { LcarsPanel, LcarsChip } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import {
  LAYOUT_PRESETS,
  useFavorites,
  useRecents,
  useWorkspaceStore,
} from '../state';
import { listTools, listToolsByCategory, type ToolCategory, type ToolDescriptor } from '../tools';
import styles from './HomeView.module.css';

export interface HomeViewProps {
  onOpenTool: (toolId: string) => void;
  /** Optional hook for "⌘K to open palette" affordance. Phase 5 wires it. */
  onOpenPalette?: () => void;
}

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  text: 'TEXT & FORMAT',
  validation: 'VALIDATION',
  data: 'DATA & ENCODING',
  binary: 'BINARY',
  network: 'NETWORK',
  utilities: 'UTILITIES',
};

/**
 * HomeView — launchpad rendered in the center zone when no tool is open.
 *
 * The workspace's "empty state" was previously an LcarsEmptyState with a
 * single OPEN SAMPLE pill — enough for the phase-3 scaffold but unhelpful
 * as a daily landing. HomeView replaces that with three zones:
 *
 *   1. Hero      — brand banner + command-palette affordance.
 *   2. Pinned    — favorited tools, ordered most-recently-pinned-first.
 *   3. Recent    — recently-opened tools (pinned ones filtered out so the
 *                  same card doesn't appear in both lists).
 *   4. Browse    — full registry grouped by category.
 *
 * Each tool renders as an LcarsPanel card: category/section color on the
 * left as a color bar + full tool name + one-line description. Clicking
 * the card dispatches `onOpenTool(id)` which in AppShell calls the
 * workspace store's openTool() and trackOpen() — so launching from here
 * feeds the same recents list.
 *
 * Why LcarsPanel instead of a bespoke card: every rail-panel interaction
 * in this app already uses LcarsPanel; reusing it here keeps the visual
 * grammar consistent and lets a future theme-swap propagate the hover /
 * active rules everywhere at once.
 */
export const HomeView: FC<HomeViewProps> = ({ onOpenTool, onOpenPalette }) => {
  const { theme } = useTheme();
  const favorites = useFavorites();
  const recents = useRecents();
  const layoutPreset = useWorkspaceStore((s) => s.layoutPreset);
  const applyPreset = useWorkspaceStore((s) => s.applyPreset);

  const presetList = useMemo(() => Object.values(LAYOUT_PRESETS), []);

  const allTools = useMemo(() => listTools(), []);
  const byId = useMemo(() => {
    const m = new Map<string, ToolDescriptor>();
    for (const t of allTools) m.set(t.id, t);
    return m;
  }, [allTools]);

  const pinnedTools = useMemo(
    () =>
      favorites
        .map((id) => byId.get(id))
        .filter((t): t is ToolDescriptor => Boolean(t)),
    [favorites, byId],
  );

  const recentTools = useMemo(
    () =>
      recents
        .map((id) => byId.get(id))
        .filter(
          (t): t is ToolDescriptor => Boolean(t) && !favorites.includes(t!.id),
        ),
    [recents, byId, favorites],
  );

  const byCategory = useMemo(() => listToolsByCategory(), []);
  const browseCategories = (Object.keys(CATEGORY_LABELS) as ToolCategory[])
    .map((id) => ({ id, label: CATEGORY_LABELS[id], tools: byCategory[id] }))
    .filter((cat) => cat.tools.length > 0);

  const renderCard = (tool: ToolDescriptor, color: string) => (
    <button
      key={tool.id}
      type="button"
      className={styles.card}
      onClick={() => onOpenTool(tool.id)}
      aria-label={`Open ${tool.name}`}
    >
      <span className={styles.cardAccent} style={{ backgroundColor: color }} />
      <span className={styles.cardBody}>
        <span className={styles.cardName}>{tool.name}</span>
        <span className={styles.cardDesc}>{tool.description}</span>
      </span>
    </button>
  );

  // Palette mirrors LeftNavigator's so PINNED/RECENT/category sections
  // carry the same colors everywhere and the user's mental model of
  // "butterscotch = my stuff, bluey = history, varied = browse" stays
  // consistent across home and rail.
  const pinnedColor = theme.colors.butterscotch;
  const recentColor = theme.colors.bluey;
  const browsePalette = [
    theme.colors.orange,
    theme.colors.bluey,
    theme.colors.butterscotch,
    theme.colors.africanViolet,
    theme.colors.red,
    theme.colors.lilac,
  ];

  return (
    <div className={styles.root} aria-label="Home view">
      <header className={styles.hero}>
        {/* HYPERSPANNER LcarsBanner removed — the AppShell's top rail
          * already carries the product name; repeating it here on the
          * launchpad was redundant chrome. The eyebrow + lead remain
          * to ground the page as the home/launchpad surface. */}
        <div className={styles.heroBannerRow}>
          <span className={styles.heroEyebrow}>HOME · HME-00</span>
        </div>
        <p className={styles.heroLead}>
          Developer instrument panel. Pick a tool from the rail, pin favorites,
          or jump to the command palette.
        </p>
        <div className={styles.heroActions}>
          <LcarsChip
            variant="secondary"
            size="small"
            onClick={onOpenPalette}
            aria-label="Open command palette"
          >
            ⌘K · PALETTE
          </LcarsChip>
          <LcarsChip variant="secondary" size="small">
            {allTools.length} TOOLS
          </LcarsChip>
        </div>
      </header>

      {pinnedTools.length > 0 && (
        <section className={styles.section} aria-labelledby="home-pinned-hd">
          <LcarsPanel
            color={pinnedColor}
            height="2.25rem"
            className={styles.sectionHeader}
          >
            <span id="home-pinned-hd">PINNED</span>
          </LcarsPanel>
          <div className={styles.grid}>
            {pinnedTools.map((tool) => renderCard(tool, pinnedColor))}
          </div>
        </section>
      )}

      {recentTools.length > 0 && (
        <section className={styles.section} aria-labelledby="home-recent-hd">
          <LcarsPanel
            color={recentColor}
            height="2.25rem"
            className={styles.sectionHeader}
          >
            <span id="home-recent-hd">RECENT</span>
          </LcarsPanel>
          <div className={styles.grid}>
            {recentTools.map((tool) => renderCard(tool, recentColor))}
          </div>
        </section>
      )}

      {/* Layout presets section. Lives between Recent and Browse because
        * it's a workspace-shape control (more like the chrome above) and
        * shouldn't visually compete with the per-tool grid below. The
        * card pattern matches the tool cards so the layout reads as the
        * same launchpad grammar — just with workspace-arrangement
        * targets instead of tool targets. */}
      <section className={styles.section} aria-labelledby="home-presets-hd">
        <LcarsPanel
          color={theme.colors.lilac}
          height="2.25rem"
          className={styles.sectionHeader}
        >
          <span id="home-presets-hd">LAYOUT PRESETS</span>
        </LcarsPanel>
        <div className={styles.grid}>
          {presetList.map((preset) => {
            const isActive = preset.id === layoutPreset;
            const cardClass = [
              styles.card,
              styles.presetCard,
              isActive ? styles.presetCardActive : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={preset.id}
                type="button"
                className={cardClass}
                onClick={() => applyPreset(preset.id)}
                aria-label={`Apply ${preset.name} layout preset${
                  isActive ? ' (currently active)' : ''
                }`}
                aria-pressed={isActive}
              >
                <span
                  className={styles.cardAccent}
                  style={{ backgroundColor: theme.colors.lilac }}
                />
                <span className={styles.cardBody}>
                  <span className={styles.cardName}>{preset.name}</span>
                  <span
                    className={`${styles.cardDesc} ${styles.cardDescWrap}`}
                  >
                    {preset.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="home-browse-hd">
        <LcarsPanel
          color={theme.colors.orange}
          height="2.25rem"
          className={styles.sectionHeader}
        >
          <span id="home-browse-hd">BROWSE · ALL TOOLS</span>
        </LcarsPanel>
        {browseCategories.map((cat, index) => {
          const color = browsePalette[index % browsePalette.length];
          return (
            <div key={cat.id} className={styles.categoryGroup}>
              <h3 className={styles.categoryLabel} style={{ color }}>
                {cat.label}
              </h3>
              <div className={styles.grid}>
                {cat.tools.map((tool) => renderCard(tool, color))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
