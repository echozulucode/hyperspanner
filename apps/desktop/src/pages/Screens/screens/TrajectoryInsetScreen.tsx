import type { FC } from 'react';
import {
  LcarsPanel,
  LcarsPill,
  LcarsStandardLayout,
  LcarsWireframeInset,
  type LcarsBarSegment,
} from '@hyperspanner/lcars-ui';
import { useTheme } from '../../../contexts/ThemeContext';
import styles from './TrajectoryInsetScreen.module.css';

/**
 * TrajectoryInsetScreen — de-risk showcase for LcarsWireframeInset
 * with multiple body content types (grid, bar chart, horizon line).
 */
export const TrajectoryInsetScreen: FC = () => {
  const { theme } = useTheme();

  const railEndColor = theme.colors.orange;

  const topPanels = (
    <>
      <LcarsPanel
        size="flex"
        color={theme.colors.butterscotch}
        active={true}
        onClick={() => {}}
      >
        TRAJECTORY INSET
      </LcarsPanel>
      <LcarsPanel
        size="flex"
        color={railEndColor}
        seamless
        active={false}
        onClick={() => {}}
      >
        PRESSURE TEST
      </LcarsPanel>
    </>
  );

  const navigation = (
    <LcarsPill variant="navigation" color={theme.colors.butterscotch}>
      06 INSETS
    </LcarsPill>
  );

  const topRailColor = railEndColor;
  const bottomRailColor = theme.colors.red;

  const topBarSegments: LcarsBarSegment[] = [
    { width: 140, color: topRailColor },
    { width: 40, color: theme.colors.butterscotch },
    { flex: true, color: theme.colors.africanViolet },
    { width: 120, color: theme.colors.orange },
  ];

  const bottomBarSegments: LcarsBarSegment[] = [
    { width: 140, color: bottomRailColor },
    { width: 40, color: theme.colors.butterscotch },
    { flex: true, color: theme.colors.orange },
    { width: 120, color: theme.colors.butterscotch },
  ];

  return (
    <LcarsStandardLayout
      title="TRAJECTORY INSET"
      topPanels={topPanels}
      navigation={navigation}
      topRailColor={topRailColor}
      bottomRailColor={bottomRailColor}
      topBarSegments={topBarSegments}
      bottomBarSegments={bottomBarSegments}
      trim={false}
    >
      {/* ─── Top row: 2-column grid ────────────────────────────────── */}
      <div className={styles.gridTop}>
        {/* TOP-LEFT: Sensor Grid */}
        <LcarsWireframeInset
          title="SENSOR GRID"
          code="SG-204"
          footerLeft="RANGE 5000M"
          footerRight="NOMINAL"
        >
          <SensorGridSvg />
        </LcarsWireframeInset>

        {/* TOP-RIGHT: Power Flow */}
        <LcarsWireframeInset
          title="POWER FLOW"
          code="ΔP-17"
          footerLeft="ONLINE"
          footerRight="92%"
        >
          <PowerFlowSvg />
        </LcarsWireframeInset>
      </div>

      {/* ─── Bottom row: Full-width ────────────────────────────────── */}
      <div className={styles.gridBottom}>
        {/* BOTTOM: Navigation */}
        <LcarsWireframeInset
          title="NAVIGATION"
          code="NAV-ECHO"
          footerLeft="HEADING 090"
          footerRight="VELOCITY 0.5c"
        >
          <NavigationHorizonSvg />
        </LcarsWireframeInset>
      </div>
    </LcarsStandardLayout>
  );
};

// ─── SVG Subcomponents ────────────────────────────────────────────────

/**
 * SensorGridSvg — simple radar-like grid with concentric circles + dots
 */
const SensorGridSvg: FC = () => {
  return (
    <svg
      viewBox="0 0 300 180"
      preserveAspectRatio="xMidYMid meet"
      className={styles.insetSvg}
      aria-label="Sensor grid readout"
    >
      <defs>
        <filter id="sensorGlow">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* Concentric circles */}
      <g stroke="rgba(241, 175, 92, 0.4)" strokeWidth="0.5" fill="none">
        <circle cx="150" cy="90" r="40" />
        <circle cx="150" cy="90" r="65" />
      </g>

      {/* Cross-hairs */}
      <g stroke="rgba(241, 175, 92, 0.3)" strokeWidth="0.4">
        <line x1="80" y1="90" x2="220" y2="90" />
        <line x1="150" y1="20" x2="150" y2="160" />
      </g>

      {/* Sensor dots scattered in grid */}
      <circle cx="150" cy="90" r="2.5" fill="rgb(241, 175, 92)" filter="url(#sensorGlow)" />
      <circle cx="180" cy="75" r="2" fill="rgba(241, 175, 92, 0.7)" />
      <circle cx="120" cy="105" r="2" fill="rgba(241, 175, 92, 0.7)" />
      <circle cx="190" cy="110" r="1.8" fill="rgba(241, 175, 92, 0.6)" />
      <circle cx="110" cy="75" r="1.8" fill="rgba(241, 175, 92, 0.6)" />
      <circle cx="170" cy="50" r="2" fill="rgba(241, 175, 92, 0.7)" />
    </svg>
  );
};

/**
 * PowerFlowSvg — simple bar chart (4–5 vertical bars of varying heights)
 */
const PowerFlowSvg: FC = () => {
  return (
    <svg
      viewBox="0 0 300 180"
      preserveAspectRatio="xMidYMid meet"
      className={styles.insetSvg}
      aria-label="Power flow bar chart"
    >
      {/* Baseline */}
      <line x1="30" y1="150" x2="270" y2="150" stroke="rgba(241, 175, 92, 0.3)" strokeWidth="0.5" />

      {/* Bar 1 */}
      <rect x="50" y="110" width="30" height="40" fill="rgb(241, 175, 92)" opacity="0.9" />
      <text x="65" y="165" fontSize="8" textAnchor="middle" fill="rgba(241, 175, 92, 0.7)">
        PWR-1
      </text>

      {/* Bar 2 */}
      <rect x="100" y="80" width="30" height="70" fill="rgb(241, 175, 92)" opacity="0.8" />
      <text x="115" y="165" fontSize="8" textAnchor="middle" fill="rgba(241, 175, 92, 0.7)">
        PWR-2
      </text>

      {/* Bar 3 */}
      <rect x="150" y="60" width="30" height="90" fill="rgb(241, 175, 92)" opacity="0.9" />
      <text x="165" y="165" fontSize="8" textAnchor="middle" fill="rgba(241, 175, 92, 0.7)">
        PWR-3
      </text>

      {/* Bar 4 */}
      <rect x="200" y="100" width="30" height="50" fill="rgb(241, 175, 92)" opacity="0.8" />
      <text x="215" y="165" fontSize="8" textAnchor="middle" fill="rgba(241, 175, 92, 0.7)">
        PWR-4
      </text>

      {/* Bar 5 */}
      <rect x="250" y="130" width="20" height="20" fill="rgb(241, 175, 92)" opacity="0.7" />
      <text x="260" y="165" fontSize="8" textAnchor="middle" fill="rgba(241, 175, 92, 0.7)">
        AUX
      </text>
    </svg>
  );
};

/**
 * NavigationHorizonSvg — minimalist horizon line + compass ticks
 */
const NavigationHorizonSvg: FC = () => {
  return (
    <svg
      viewBox="0 0 300 180"
      preserveAspectRatio="xMidYMid meet"
      className={styles.insetSvg}
      aria-label="Navigation horizon display"
    >
      {/* Horizon line */}
      <line x1="0" y1="90" x2="300" y2="90" stroke="rgba(241, 175, 92, 0.6)" strokeWidth="1" />

      {/* Sky gradient hint (subtle) */}
      <rect x="0" y="0" width="300" height="90" fill="rgba(241, 175, 92, 0.05)" />

      {/* Compass tick marks */}
      <g stroke="rgba(241, 175, 92, 0.5)" strokeWidth="0.5">
        {/* N (top) */}
        <line x1="150" y1="85" x2="150" y2="75" />
        {/* NE */}
        <line x1="185" y1="88" x2="195" y2="78" />
        {/* E (right) */}
        <line x1="215" y1="90" x2="225" y2="90" />
        {/* SE */}
        <line x1="185" y1="92" x2="195" y2="102" />
        {/* S (bottom) */}
        <line x1="150" y1="95" x2="150" y2="105" />
        {/* SW */}
        <line x1="115" y1="92" x2="105" y2="102" />
        {/* W (left) */}
        <line x1="75" y1="90" x2="65" y2="90" />
        {/* NW */}
        <line x1="115" y1="88" x2="105" y2="78" />
      </g>

      {/* Cardinal labels */}
      <g fontFamily="'SF Mono', Menlo, monospace" fontSize="7" fill="rgba(241, 175, 92, 0.7)" textAnchor="middle">
        <text x="150" y="70">N</text>
        <text x="230" y="95">E</text>
        <text x="150" y="115">S</text>
        <text x="50" y="95">W</text>
      </g>

      {/* Center heading indicator */}
      <circle cx="150" cy="90" r="4" fill="none" stroke="rgb(241, 175, 92)" strokeWidth="1" />
      <line x1="150" y1="86" x2="150" y2="75" stroke="rgb(241, 175, 92)" strokeWidth="1.2" />
    </svg>
  );
};

export default TrajectoryInsetScreen;
