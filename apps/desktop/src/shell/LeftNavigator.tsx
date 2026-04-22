import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { LcarsPanel } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import { listToolsByCategory, type ToolCategory, type ToolDescriptor } from '../tools';
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
 * Lives inside LcarsStandardLayout's `bottomPanels` slot. Each category
 * is a clickable LcarsPanel; clicking expands it in place to reveal its
 * tools (also as thinner LcarsPanels). The whole stack scrolls
 * independently when it overflows the rail.
 *
 * We drop the old search + favorites header because those primitives
 * (LcarsSearchField + LcarsPill cluster) don't compose cleanly inside
 * the rail's right-anchored panel grammar. Re-adding them belongs in
 * the layout primitive's navigation slot up top, or as a future
 * dedicated search overlay. For now: categories-only is a clean,
 * canonical rail.
 */
export const LeftNavigator: FC<LeftNavigatorProps> = ({
  activeToolId,
  openToolIds,
  onOpenTool,
  railColor,
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    theme.colors.lilac ?? theme.colors.africanViolet,
    theme.colors.peach ?? theme.colors.butterscotch,
  ];

  return (
    <div className={styles.stack} role="navigation" aria-label="Tool navigator">
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
                {cat.tools.map((tool) => (
                  <LcarsPanel
                    key={tool.id}
                    color={panelColor}
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
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
