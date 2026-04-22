import type { FC } from 'react';
import {
  LcarsPanel,
  LcarsStandardLayout,
  type LcarsBarSegment,
} from '@hyperspanner/lcars-ui';
import { useTheme } from '../../../contexts/ThemeContext';
import styles from './RailElbowScreen.module.css';

/**
 * RailElbowScreen (S2) — de-risk the rail + elbow corner structure.
 *
 * Pressure-test: left rail + elbow join with a stub top bar.
 * NO content — just the structural frame to verify the elbow curve
 * blends perfectly into the rail and top bar.
 *
 * The rail-color rewriting mechanism is tested here with a single panel
 * on the rail whose color must match topRailColor so the elbow curve
 * beneath it blends seamlessly.
 */
export const RailElbowScreen: FC = () => {
  const { theme } = useTheme();

  // Rail color — the LAST panel on the rail must match this so the
  // decorative curve at the bottom of the rail blends into the panel
  // rather than flashing a mismatched color.
  const railColor = theme.colors.butterscotch;

  // Single flex panel fills the rail. `seamless` prevents the dark seam
  // between the panel and the curve so the continuation reads clean.
  const topPanels = (
    <LcarsPanel size="flex" color={railColor} seamless>
      STRUCTURE
    </LcarsPanel>
  );

  // Two-segment top bar: rail-continuation width (auto-rewritten by
  // LcarsStandardLayout to match topRailColor) + flex remainder.
  const topBarSegments: LcarsBarSegment[] = [
    { width: 140, color: railColor },
    { flex: true, color: theme.colors.orange },
  ];

  return (
    <LcarsStandardLayout
      title="RAIL + ELBOW"
      topPanels={topPanels}
      topRailColor={railColor}
      bottomRailColor={theme.colors.red}
      topBarSegments={topBarSegments}
      trim={false}
    >
      <div className={styles.contentPlaceholder}>
        (elbow + rail pressure test — no content)
      </div>
    </LcarsStandardLayout>
  );
};
