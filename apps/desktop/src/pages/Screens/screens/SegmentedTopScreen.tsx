import type { FC } from 'react';
import { LcarsBar, type LcarsBarSegment } from '@hyperspanner/lcars-ui';
import { useTheme } from '../../../contexts/ThemeContext';
import styles from './SegmentedTopScreen.module.css';

/**
 * SegmentedTopScreen (S3) — de-risk the LcarsBar primitive in isolation.
 *
 * Pressure-test: canonical bar proportions (brand / elbow cap / title / state / controls).
 * Render 3 standalone LcarsBar instances stacked vertically with different
 * segment configurations to verify:
 *   - 5-segment canonical layout
 *   - Half-height seam behavior
 *   - Graceful degradation to 3-segment minimal
 */
export const SegmentedTopScreen: FC = () => {
  const { theme } = useTheme();

  // 5-SEGMENT CANONICAL: brand width, thin cap, title flex, state percent, controls width
  const canonicalSegments: LcarsBarSegment[] = [
    { width: 140, color: theme.colors.bluey },
    { width: 40, color: theme.colors.butterscotch },
    { flex: true, color: theme.colors.orange },
    { widthPercent: 18, color: theme.colors.africanViolet },
    { width: 120, color: theme.colors.red },
  ];

  // HALF-HEIGHT ROW: 4 segments, one with halfHeight: true
  const halfHeightSegments: LcarsBarSegment[] = [
    { width: 140, color: theme.colors.red },
    { width: 40, color: theme.colors.butterscotch },
    { widthPercent: 25, color: theme.colors.orange, halfHeight: true },
    { flex: true, color: theme.colors.africanViolet },
  ];

  // MINIMAL 3-SEGMENT: just brand, flex, controls
  const minimalSegments: LcarsBarSegment[] = [
    { width: 140, color: theme.colors.bluey },
    { flex: true, color: theme.colors.orange },
    { width: 120, color: theme.colors.red },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.heading}>LcarsBar Segmentation Pressure Test</div>

      {/* ─── 5-SEGMENT CANONICAL ─────────────────────────────────────── */}
      <div className={styles.barSection}>
        <div className={styles.barLabel}>5-SEGMENT CANONICAL</div>
        <LcarsBar segments={canonicalSegments} />
      </div>

      {/* ─── HALF-HEIGHT ROW ─────────────────────────────────────────── */}
      <div className={styles.barSection}>
        <div className={styles.barLabel}>HALF-HEIGHT ROW</div>
        <LcarsBar segments={halfHeightSegments} />
      </div>

      {/* ─── MINIMAL 3-SEGMENT ───────────────────────────────────────── */}
      <div className={styles.barSection}>
        <div className={styles.barLabel}>MINIMAL 3-SEGMENT</div>
        <LcarsBar segments={minimalSegments} />
      </div>

      <div className={styles.footer}>
        Canonical proportions: brand (140px) / cap (40px) / title (flex) / state (18%) / controls (120px)
      </div>
    </div>
  );
};
