import { useEffect, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import {
  LcarsDataCascade,
  LcarsPanel,
  LcarsPill,
  LcarsStandardLayout,
  type LcarsBarSegment,
} from '@hyperspanner/lcars-ui';
import { useTheme } from '../../../contexts/ThemeContext';
import styles from './HomeAutomationScreen.module.css';

type RailId = 'lights' | 'cameras' | 'energy';
type TabId = 'sensors' | 'gauges' | 'weather';

/**
 * HomeAutomationScreen — de-risk replica of the LCARS-24.2 HOME AUTOMATION
 * reference image, built on top of the ported LcarsStandardLayout.
 *
 * The rails + elbows + framing bars are provided by the layout primitive;
 * this screen just chooses rail panel colors/labels and fills the main
 * content area with the tab cluster, event log, and trajectory wireframe.
 */
export const HomeAutomationScreen: FC = () => {
  const { theme } = useTheme();
  const [activeRail, setActiveRail] = useState<RailId>('cameras');
  const [activeTab, setActiveTab] = useState<TabId>('sensors');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Top rail (rounded bottom-left, flows into top bar).
  // 3 panels share the column equally via size="flex". The LAST panel
  // (ENERGY) color MUST match topRailColor so the decorative curve
  // beneath it blends seamlessly.
  const railEndColor = theme.colors.red;
  const topPanels = (
    <>
      <LcarsPanel
        size="flex"
        color={theme.colors.africanViolet}
        active={activeRail === 'lights'}
        onClick={() => setActiveRail('lights')}
      >
        LIGHTS
      </LcarsPanel>
      <LcarsPanel
        size="flex"
        color={theme.colors.butterscotch}
        active={activeRail === 'cameras'}
        onClick={() => setActiveRail('cameras')}
      >
        CAMERAS
      </LcarsPanel>
      <LcarsPanel
        size="flex"
        color={railEndColor}
        seamless
        active={activeRail === 'energy'}
        onClick={() => setActiveRail('energy')}
      >
        ENERGY
      </LcarsPanel>
    </>
  );

  // Nav pills next to banner — reads as system shortcuts.
  const navigation = (
    <>
      <LcarsPill variant="navigation" color={theme.colors.butterscotch}>
        01 STATUS
      </LcarsPill>
      <LcarsPill variant="navigation" color={theme.colors.africanViolet}>
        02 HISTORY
      </LcarsPill>
    </>
  );

  // Rail colors MUST match the panel adjacent to the rail's decorative
  // curve, so the curve blends into the last/first panel rather than
  // flashing a third color. For the top rail the curve is at the BOTTOM
  // (adjacent to the last panel, ENERGY). The bottom rail is empty on
  // this screen, so its color is just decorative.
  const topRailColor = railEndColor;
  const bottomRailColor = theme.colors.red;

  // Custom bar segments — picked to evoke the reference's "LCARS 105" /
  // "HOME AUTOMATION" / stardate / LOGOUT segmented top bar. The FIRST
  // segment color is the rail-continuation; LcarsStandardLayout will
  // auto-rewrite it to match topRailColor / bottomRailColor, so the
  // value here is essentially a placeholder that gets overwritten.
  const topBarSegments: LcarsBarSegment[] = [
    { width: 140, color: topRailColor },
    { width: 40, color: theme.colors.butterscotch },
    { widthPercent: 35, color: theme.colors.orange },
    { flex: true, color: theme.colors.africanViolet },
    { width: 120, color: theme.colors.red },
  ];

  const bottomBarSegments: LcarsBarSegment[] = [
    { width: 140, color: bottomRailColor },
    { width: 40, color: theme.colors.butterscotch },
    { widthPercent: 25, color: theme.colors.red, halfHeight: true },
    { flex: true, color: theme.colors.africanViolet },
    { width: 120, color: theme.colors.butterscotch },
  ];

  return (
    <LcarsStandardLayout
      title="HOME AUTOMATION"
      stardate={`${formatStardate(now)} ${formatClock(now)}`}
      topPanels={topPanels}
      navigation={navigation}
      cascade={<LcarsDataCascade columns={10} rows={7} color={theme.colors.orange} />}
      topRailColor={topRailColor}
      bottomRailColor={bottomRailColor}
      topBarSegments={topBarSegments}
      bottomBarSegments={bottomBarSegments}
      trim={false}
    >
      {/* ─── Tab cluster ───────────────────────────────────────────── */}
      <div className={styles.tabCluster}>
        <TabPill
          label="SENSORS"
          color={theme.colors.butterscotch}
          active={activeTab === 'sensors'}
          onClick={() => setActiveTab('sensors')}
        />
        <TabPill
          label="GAUGES"
          color={theme.colors.africanViolet}
          active={activeTab === 'gauges'}
          onClick={() => setActiveTab('gauges')}
        />
        <TabPill
          label="WEATHER"
          color={theme.colors.butterscotch}
          active={activeTab === 'weather'}
          onClick={() => setActiveTab('weather')}
        />
      </div>

      {/* ─── Content row: event log + trajectory frame ─────────────── */}
      <div className={styles.contentRow}>
        <section className={styles.eventLog}>
          <h2 className={styles.eventLogHeading}>EVENT LOG</h2>
          <ol className={styles.eventLogList}>
            <li>
              <span className={styles.eventLogCode}>04:12:07</span>
              2 ALARM ZONES TRIGGERED
            </li>
            <li>
              <span className={styles.eventLogCode}>23:58:41</span>
              14.3 kWh USED YESTERDAY
            </li>
            <li>
              <span className={styles.eventLogCode}>MONTH</span>
              1.3 TB DATA USED THIS MONTH
            </li>
            <li>
              <span className={styles.eventLogCode}>02:40:12</span>
              GARAGE DOOR CLOSED · NORMAL
            </li>
            <li>
              <span className={styles.eventLogCode}>21:15:00</span>
              LIVING ROOM HVAC · 72°F HOLD
            </li>
          </ol>
        </section>

        <aside className={styles.trajectoryFrame}>
          <header className={styles.trajectoryHeader}>
            <span>TRAJECTORY</span>
            <span className={styles.trajectoryCode}>2374-02-1</span>
          </header>
          <div className={styles.trajectoryBody}>
            <TrajectoryWireframe />
          </div>
          <footer className={styles.trajectoryFooter}>
            <span>BEARING 127·32·04</span>
            <span>WARP 8.2</span>
          </footer>
        </aside>
      </div>
    </LcarsStandardLayout>
  );
};

// ─── Subcomponents ────────────────────────────────────────────────────

interface TabPillProps {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}

const TabPill: FC<TabPillProps> = ({ label, color, active, onClick }) => {
  // --tab-pill-color preserves the original color so the active state
  // can still show it as a left-edge stripe even after we swap the
  // background to the almond-creme highlight.
  const style = {
    backgroundColor: color,
    '--tab-pill-color': color,
  } as CSSProperties;
  return (
    <button
      type="button"
      className={`${styles.tabPill} ${active ? styles.tabPillActive : ''}`}
      style={style}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

/**
 * TrajectoryWireframe — a more considered Enterprise silhouette built
 * from an SVG wireframe over a polar-grid + hex backdrop. Stroked with
 * theme-aware colors and a subtle glow so it reads like a tactical
 * plot rather than clip-art.
 */
const TrajectoryWireframe: FC = () => {
  return (
    <svg
      viewBox="0 0 300 180"
      preserveAspectRatio="xMidYMid meet"
      className={styles.trajectorySvg}
      aria-label="Tactical trajectory plot"
    >
      <defs>
        <pattern
          id="hexgrid"
          width="16"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 7 L 8 0 L 16 7 L 8 14 Z"
            fill="none"
            stroke="rgba(241, 175, 92, 0.18)"
            strokeWidth="0.4"
          />
        </pattern>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(241, 175, 92, 0.22)" />
          <stop offset="100%" stopColor="rgba(241, 175, 92, 0)" />
        </radialGradient>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      {/* Hex backdrop */}
      <rect x="0" y="0" width="300" height="180" fill="url(#hexgrid)" />

      {/* Polar reticle centered on the ship */}
      <g
        transform="translate(150,90)"
        stroke="rgba(241, 175, 92, 0.35)"
        strokeWidth="0.5"
        fill="none"
      >
        <circle r="30" />
        <circle r="55" />
        <circle r="80" />
        <line x1="-90" y1="0" x2="90" y2="0" />
        <line x1="0" y1="-60" x2="0" y2="60" />
        <line x1="-63" y1="-63" x2="63" y2="63" />
        <line x1="-63" y1="63" x2="63" y2="-63" />
      </g>

      {/* Glow halo behind the ship */}
      <circle cx="150" cy="90" r="30" fill="url(#glow)" />

      {/* Enterprise — top-down wireframe silhouette. Proportions are
       * deliberately clean (45° nacelle sweep) so it reads as a ship. */}
      <g
        stroke="rgb(241, 175, 92)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Saucer section */}
        <ellipse cx="150" cy="72" rx="42" ry="14" />
        <ellipse cx="150" cy="72" rx="30" ry="10" opacity="0.6" />
        <ellipse cx="150" cy="72" rx="6" ry="2.5" />
        {/* Neck */}
        <line x1="150" y1="86" x2="150" y2="96" />
        {/* Secondary hull */}
        <path d="M 132 96 L 168 96 L 172 108 L 170 116 L 162 122 L 150 124 L 138 122 L 130 116 L 128 108 Z" />
        {/* Deflector */}
        <circle cx="150" cy="121" r="2" fill="rgb(231, 117, 99)" stroke="none" />
        {/* Pylons */}
        <line x1="138" y1="100" x2="108" y2="108" />
        <line x1="162" y1="100" x2="192" y2="108" />
        {/* Nacelles */}
        <rect x="72" y="104" width="44" height="8" rx="4" />
        <rect x="72" y="104" width="8" height="8" rx="4" fill="rgb(125, 165, 201)" stroke="none" />
        <rect x="184" y="104" width="44" height="8" rx="4" />
        <rect x="220" y="104" width="8" height="8" rx="4" fill="rgb(125, 165, 201)" stroke="none" />
      </g>

      {/* Projected trajectory — dashed forward arc */}
      <g
        stroke="rgba(231, 117, 99, 0.9)"
        strokeWidth="1"
        strokeDasharray="4 3"
        fill="none"
      >
        <path d="M 150 90 Q 210 60 258 32" />
      </g>
      <circle cx="258" cy="32" r="2.2" fill="rgb(231, 117, 99)" filter="url(#softBlur)" />

      {/* Sensor bearing ticks + labels at top edge */}
      <g stroke="rgba(231, 117, 99, 0.55)" strokeWidth="0.6">
        <line x1="30" y1="10" x2="30" y2="16" />
        <line x1="90" y1="10" x2="90" y2="16" />
        <line x1="150" y1="10" x2="150" y2="18" />
        <line x1="210" y1="10" x2="210" y2="16" />
        <line x1="270" y1="10" x2="270" y2="16" />
      </g>
      <g
        fontFamily="'SF Mono', Menlo, monospace"
        fontSize="6"
        fill="rgba(241, 175, 92, 0.7)"
      >
        <text x="30" y="8" textAnchor="middle">000</text>
        <text x="90" y="8" textAnchor="middle">045</text>
        <text x="150" y="8" textAnchor="middle">090</text>
        <text x="210" y="8" textAnchor="middle">135</text>
        <text x="270" y="8" textAnchor="middle">180</text>
      </g>
    </svg>
  );
};

// ─── Star date formatting ─────────────────────────────────────────────

function formatStardate(d: Date): string {
  const shipYear = String(d.getFullYear()).slice(-2);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const progress = (dayOfYear / 365) * 10;
  return `${shipYear}${dayOfYear.toString().padStart(2, '0')}.${Math.floor(progress)
    .toString()
    .padStart(1, '0')}`;
}

function formatClock(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
