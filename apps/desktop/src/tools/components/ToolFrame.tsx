import type { CSSProperties, FC, ReactNode } from 'react';

import type { Zone } from '../../state';
import styles from './ToolFrame.module.css';

export interface ToolFrameProps {
  /** Tool id — rendered as the uppercase eyebrow label. */
  toolId: string;
  /** Human-readable title. Falls back to `toolId`. */
  title: string;
  /** Optional subtitle shown under the title in the full form. */
  subtitle?: string;
  /** The zone the tool is currently docked in. Drives compact vs full. */
  zone?: Zone;
  /** Right-aligned action pills, e.g. Format / Minify. */
  actions?: ReactNode;
  /** Status bar at the bottom (use `ToolStatusPill` + raw metadata). */
  status?: ReactNode;
  /** The tool body. */
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * ToolFrame — the standard tool chrome every Phase 6 tool drops into.
 *
 * Responsibilities:
 *   - Consistent eyebrow + title header (orange title, violet eyebrow —
 *     matches the placeholder aesthetic so migrating from placeholder to
 *     real tool isn't a visual jump).
 *   - Zone-responsive sizing: `right` / `bottom` docks render a compact
 *     header (tighter padding, smaller title, single-line) so the narrow
 *     inspector column and the short console pane both fit without
 *     scrollbars. `center` gets the full form. Both forms share a single
 *     DOM tree — only class modifiers change — so React state stays put
 *     when the user drags the tab between zones.
 *   - Optional action pill cluster on the right of the header. Tools
 *     pass their own `<LcarsPill>` stack; the frame just positions them.
 *   - Optional status row at the bottom. Kept visually distinct from the
 *     body (top border in --lcars-color-gutter) so transient feedback
 *     doesn't look like part of the content.
 *
 * Not a primitive — lives in `apps/desktop/src/tools/components/` because
 * it's tool-shell scaffolding, not a reusable LCARS design-token asset.
 * Moving it into `@hyperspanner/lcars-ui` would couple the library to
 * tool concepts (zone-awareness, status footer) it shouldn't know about.
 */
export const ToolFrame: FC<ToolFrameProps> = ({
  toolId,
  title,
  subtitle,
  zone,
  actions,
  status,
  children,
  className,
  style,
}) => {
  const isCompact = zone === 'right' || zone === 'bottom';
  const frameClass = [
    styles.frame,
    isCompact ? styles.frameCompact : styles.frameFull,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={frameClass} style={style}>
      <header className={styles.header}>
        <div className={styles.headerTitles}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowId}>{toolId.toUpperCase()}</span>
            {/* In compact docks the subtitle is hidden to save vertical
              * space — surface it via an info icon next to the eyebrow so
              * the description is still one hover away. The native
              * `title` attribute provides the tooltip without pulling in
              * a popover library. */}
            {subtitle && isCompact ? (
              <span
                className={styles.infoIcon}
                title={subtitle}
                role="img"
                aria-label={`Tool description: ${subtitle}`}
              >
                ⓘ
              </span>
            ) : null}
          </div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && !isCompact ? (
            <p className={styles.subtitle}>{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>

      <div className={styles.body}>{children}</div>

      {status ? <footer className={styles.status}>{status}</footer> : null}
    </div>
  );
};
