import type { CSSProperties, FC, ReactNode } from 'react';
import { LcarsBar, type LcarsBarSegment } from '../LcarsBar';
import { LcarsBanner } from '../LcarsBanner';
import styles from './LcarsStandardLayout.module.css';

export interface LcarsStandardLayoutProps {
  /** Title text rendered in the right-column banner. */
  title?: ReactNode;
  /** Stardate or sub-title appended after the title. */
  stardate?: string;
  /**
   * Optional secondary element rendered inline with the banner on the
   * right-hand side, baseline-aligned with the banner text. Use this to
   * surface a compact context marker (e.g. the active tool as an
   * LcarsChip) without competing with the main title's scale. Matches
   * the "LcarsBanner · LcarsChip" composition shown in the primitive
   * gallery.
   */
  titleChip?: ReactNode;

  /** Stacked LcarsPanel children for the TOP rail (blue by default). */
  topPanels?: ReactNode;
  /** Stacked LcarsPanel children for the BOTTOM rail (red by default).
   *  Omit for the classic decorative gap look. */
  bottomPanels?: ReactNode;

  /** Optional cascade/readout slot next to the banner. */
  cascade?: ReactNode;
  /** Navigation pill cluster rendered on the right of the banner row. */
  navigation?: ReactNode;

  /** Override colors for the rails (must match elbow colors). */
  topRailColor?: string;
  bottomRailColor?: string;

  /** Segments for the framing bars. If omitted we render a canonical
   *  LCARS-24.2 default pair. */
  topBarSegments?: LcarsBarSegment[];
  bottomBarSegments?: LcarsBarSegment[];

  /** Hide the fixed black head/base trim (useful when embedded). */
  trim?: boolean;

  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_TOP: LcarsBarSegment[] = [
  { widthPercent: 40, color: 'var(--lcars-color-bluey, #9fb5d7)' },
  { widthPercent: 4, color: 'var(--lcars-color-orange, #ef8977)' },
  { widthPercent: 17, color: 'var(--lcars-color-african-violet, #c18ab6)' },
  { flex: true, color: 'var(--lcars-color-african-violet, #c18ab6)' },
  { widthPercent: 4, color: 'var(--lcars-color-red, #d44d3c)' },
];

const DEFAULT_BOTTOM: LcarsBarSegment[] = [
  { widthPercent: 40, color: 'var(--lcars-color-red, #d44d3c)' },
  { widthPercent: 4, color: 'var(--lcars-color-butterscotch, #f1af5c)' },
  { widthPercent: 17, color: 'var(--lcars-color-red, #d44d3c)', halfHeight: true },
  { flex: true, color: 'var(--lcars-color-african-violet, #c18ab6)' },
  { widthPercent: 4, color: 'var(--lcars-color-butterscotch, #f1af5c)' },
];

/**
 * Replace the first segment's color with `railColor` (if provided).
 * Pure — returns a new array, doesn't mutate the caller's segments.
 */
function syncFirstSegmentColor(
  segments: LcarsBarSegment[],
  railColor: string | undefined,
): LcarsBarSegment[] {
  if (!railColor || segments.length === 0) return segments;
  return [{ ...segments[0], color: railColor }, ...segments.slice(1)];
}

/**
 * LcarsStandardLayout — canonical two-row LCARS frame.
 *
 * Composes:
 *   - Rounded left rails (rail color = elbow color)
 *   - Right column with banner + navigation + top bar (elbow connects them)
 *   - Second row with bottom bar + main content (elbow connects them)
 *
 * Colors propagate to the elbow diagonal via local CSS vars so each
 * consumer can retheme a single instance without touching globals.
 */
export const LcarsStandardLayout: FC<LcarsStandardLayoutProps> = ({
  title,
  stardate,
  titleChip,
  topPanels,
  bottomPanels,
  cascade,
  navigation,
  topRailColor,
  bottomRailColor,
  topBarSegments,
  bottomBarSegments,
  trim = true,
  children,
  footer,
  className = '',
  style = {},
}) => {
  const rootStyle: CSSProperties = {
    ...style,
    ...(topRailColor
      ? ({ '--lcars-layout-left-top-color': topRailColor } as CSSProperties)
      : {}),
    ...(bottomRailColor
      ? ({ '--lcars-layout-left-bottom-color': bottomRailColor } as CSSProperties)
      : {}),
  };

  // LCARS grammar: the rail, the elbow quarter-circle, and the FIRST
  // segment of the adjacent bar form a single continuous visual shape.
  // If a consumer overrides the rail color (e.g. to match the last rail
  // panel), the first bar segment must follow — otherwise you see a
  // colored "arch" where the elbow's quarter-circle meets a differently
  // colored bar segment. Sync them here so the consumer can just set
  // `topRailColor` / `bottomRailColor` and not worry about it.
  const topBar = syncFirstSegmentColor(topBarSegments ?? DEFAULT_TOP, topRailColor);
  const botBar = syncFirstSegmentColor(bottomBarSegments ?? DEFAULT_BOTTOM, bottomRailColor);

  const bannerText =
    title != null ? (
      <>
        {title}
        {stardate ? ` ● ${stardate}` : ''}
      </>
    ) : null;

  return (
    <div className={`${styles.container} ${className}`} style={rootStyle}>
      {trim && <div className={styles.headtrim} aria-hidden="true" />}

      <div className={styles.wrap}>
        <div
          className={`${styles.leftFrameTop} ${topPanels ? styles.hasChildren : ''}`}
        >
          {topPanels}
        </div>
        <div className={styles.rightFrameTop}>
          {bannerText !== null &&
            (titleChip ? (
              <div className={styles.titleRow}>
                <LcarsBanner size="large">{bannerText}</LcarsBanner>
                <div className={styles.titleChip}>{titleChip}</div>
              </div>
            ) : (
              <LcarsBanner size="large">{bannerText}</LcarsBanner>
            ))}

          <div className={styles.bannerRow}>
            {cascade && <div className={styles.cascadeSlot}>{cascade}</div>}
            {navigation && <div className={styles.navigation}>{navigation}</div>}
          </div>

          <div className={styles.spacer} />

          <LcarsBar segments={topBar} className={styles.topBarSlot} />

          {/* Concrete-div elbow corner. Absolutely positioned over the
           * rail→bar join; its radial-gradient background draws the
           * rail-colored quarter-crescent. See CSS comment on .elbowTop. */}
          <div className={styles.elbowTop} aria-hidden="true" />
        </div>
      </div>

      <div className={`${styles.wrap} ${styles.gap}`}>
        <div
          className={`${styles.leftFrame} ${bottomPanels ? styles.hasChildren : ''}`}
        >
          {bottomPanels}
        </div>
        <div className={styles.rightFrame}>
          <LcarsBar segments={botBar} />
          <main className={styles.main}>{children}</main>
          {footer}
          {/* Concrete-div elbow corner — mirror of the top elbow, flipped. */}
          <div className={styles.elbowBottom} aria-hidden="true" />
        </div>
      </div>

      {trim && <div className={styles.baseboard} aria-hidden="true" />}
    </div>
  );
};
