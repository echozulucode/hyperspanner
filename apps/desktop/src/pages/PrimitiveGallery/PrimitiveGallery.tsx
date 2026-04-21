import { useMemo, useState } from 'react';
import {
  LcarsBanner,
  LcarsBar,
  LcarsChip,
  LcarsCommandBar,
  LcarsEmptyState,
  LcarsPanel,
  LcarsPill,
  LcarsRail,
  LcarsSearchField,
  LcarsSplitHandle,
  LcarsTabs,
  LcarsTelemetryLabel,
  LcarsZoneHeader,
  lcarsColor,
  type LcarsTab,
} from '@hyperspanner/lcars-ui';
import { useTheme } from '../../contexts/ThemeContext';
import { themes, type ThemeName } from '../../themes';
import styles from './PrimitiveGallery.module.css';

const themeOrder: ThemeName[] = [
  'picard-modern',
  'classic',
  'nemesis-blue',
  'lower-decks',
];

const tabs: LcarsTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    content: (
      <div style={{ padding: '1rem 1.25rem' }}>
        <strong style={{ color: lcarsColor.orange }}>Overview</strong>
        <p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>
          Tab bodies render with the active theme tokens — no primitive holds its own
          palette.
        </p>
      </div>
    ),
  },
  {
    id: 'traces',
    label: 'Traces',
    content: (
      <div style={{ padding: '1rem 1.25rem' }}>
        <strong style={{ color: lcarsColor.africanViolet }}>Traces</strong>
        <p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>
          Secondary pane for diagnostic data.
        </p>
      </div>
    ),
  },
  {
    id: 'diag',
    label: 'Diagnostics',
    content: (
      <div style={{ padding: '1rem 1.25rem' }}>
        <strong style={{ color: lcarsColor.bluey }}>Diagnostics</strong>
        <p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>Runtime self-checks.</p>
      </div>
    ),
  },
];

export interface PrimitiveGalleryProps {
  /** Called when the "Back to Shell" affordance is invoked. */
  onBack?: () => void;
}

export const PrimitiveGallery = ({ onBack }: PrimitiveGalleryProps = {}) => {
  const { theme, themeName, setTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [activeTool, setActiveTool] = useState<string>('json-pad');
  const [splitPx, setSplitPx] = useState(320);

  const framingSegments = useMemo(
    () => [
      { width: 160, color: theme.colors.orange },
      { width: 12, color: theme.colors.background },
      { color: theme.colors.africanViolet, flex: true },
      { width: 8, color: theme.colors.background },
      { width: 96, color: theme.colors.butterscotch },
      { width: 8, color: theme.colors.background },
      { width: 200, color: theme.colors.orange },
    ],
    [theme],
  );

  const bottomSegments = useMemo(
    () => [
      { width: 72, color: theme.colors.africanViolet },
      { width: 8, color: theme.colors.background },
      { color: theme.colors.orange, flex: true },
      { width: 8, color: theme.colors.background },
      { width: 140, color: theme.colors.bluey },
    ],
    [theme],
  );

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Primitive Gallery</h1>
          <div className={styles.subtitle}>
            Phase 1 · @hyperspanner/lcars-ui · {themeName}
          </div>
        </div>

        <div className={styles.themeSwitch}>
          {onBack && (
            <LcarsPill
              size="small"
              rounded="both"
              color={theme.colors.bluey}
              onClick={onBack}
              aria-label="Return to application shell"
            >
              ← SHELL
            </LcarsPill>
          )}
          <span className={styles.themeLabel}>Theme</span>
          {themeOrder.map((name) => (
            <LcarsPill
              key={name}
              size="small"
              rounded={
                name === themeOrder[0]
                  ? 'left'
                  : name === themeOrder[themeOrder.length - 1]
                    ? 'right'
                    : 'none'
              }
              active={themeName === name}
              color={
                themeName === name
                  ? themes[name].colors.orange
                  : themes[name].colors.africanViolet
              }
              onClick={() => setTheme(name)}
            >
              {name}
            </LcarsPill>
          ))}
        </div>
      </div>

      {/* Framing bars (LcarsBar) */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LcarsBar — Framing Rails</h2>
          <span className={styles.sectionNote}>Top & bottom shell frames</span>
        </header>
        <div className={styles.framingBars}>
          <LcarsBar segments={framingSegments} />
          <LcarsBar segments={bottomSegments} />
        </div>
      </section>

      {/* Layout: Rail + Zone columns */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LcarsRail · LcarsPanel · LcarsZoneHeader</h2>
          <span className={styles.sectionNote}>Left rail + docked zones</span>
        </header>

        <div className={styles.layoutDemo}>
          <LcarsRail topCap bottomCap>
            <LcarsPanel size={1} number="01" label="TOOLS" />
            <LcarsPanel size={8} number="02" label="FAVORITES" color={theme.colors.africanViolet} />
            <LcarsPanel
              size={5}
              number="03"
              label="PRESETS"
              color={theme.colors.butterscotch}
              onClick={() => undefined}
            />
            <LcarsPanel size={9} number="04" label="TELEMETRY" color={theme.colors.bluey} />
          </LcarsRail>

          <div className={styles.zoneStack}>
            <div className={styles.zone}>
              <LcarsZoneHeader
                eyebrow="CTR-01"
                title={
                  activeTool === 'json-pad' ? 'JSON PAD' : 'HASH WORKBENCH'
                }
                indicatorColor={theme.colors.green}
                controls={
                  <>
                    <LcarsChip variant="info" size="small">
                      READY
                    </LcarsChip>
                    <LcarsPill size="small" color={theme.colors.africanViolet}>
                      DOCK
                    </LcarsPill>
                    <LcarsPill size="small" color={theme.colors.orange}>
                      CLOSE
                    </LcarsPill>
                  </>
                }
              />
              <LcarsCommandBar label="ACTIONS">
                <LcarsPill
                  size="small"
                  color={theme.colors.orange}
                  onClick={() => setActiveTool('json-pad')}
                  active={activeTool === 'json-pad'}
                >
                  FORMAT
                </LcarsPill>
                <LcarsPill
                  size="small"
                  color={theme.colors.africanViolet}
                  onClick={() => setActiveTool('hash-wb')}
                  active={activeTool === 'hash-wb'}
                >
                  MINIFY
                </LcarsPill>
                <LcarsCommandBar.Divider />
                <LcarsPill size="small" color={theme.colors.butterscotch}>
                  COPY
                </LcarsPill>
                <LcarsPill size="small" color={theme.colors.bluey}>
                  EXPORT
                </LcarsPill>
              </LcarsCommandBar>
              <div className={styles.zoneBody}>
                <LcarsTabs tabs={tabs} defaultTab="overview" />
              </div>
            </div>

            <div className={styles.zone}>
              <LcarsZoneHeader
                eyebrow="RT-02"
                title="INSPECTOR"
                color={theme.colors.bluey}
                indicatorColor={theme.colors.butterscotch}
              />
              <div className={styles.zoneBody}>
                <LcarsEmptyState
                  eyebrow="CHANNEL 0000"
                  title="No selection"
                  description="Pick a record from the center pane to populate this inspector."
                  icon={<span aria-hidden>◈</span>}
                  action={
                    <LcarsPill color={theme.colors.orange} onClick={() => undefined}>
                      OPEN SAMPLE
                    </LcarsPill>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pills */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LcarsPill</h2>
          <span className={styles.sectionNote}>
            Sizes, rounded variants, active state
          </span>
        </header>
        <div className={styles.row}>
          <LcarsPill size="small">Small</LcarsPill>
          <LcarsPill size="medium">Medium</LcarsPill>
          <LcarsPill size="large">Large</LcarsPill>
          <LcarsPill color={theme.colors.butterscotch}>Accent</LcarsPill>
          <LcarsPill color={theme.colors.bluey}>Info</LcarsPill>
          <LcarsPill disabled>Disabled</LcarsPill>
          <LcarsPill active>Active</LcarsPill>
        </div>
        <div className={styles.row}>
          <LcarsPill rounded="left" color={theme.colors.orange}>
            Left
          </LcarsPill>
          <LcarsPill rounded="none" color={theme.colors.africanViolet}>
            Middle
          </LcarsPill>
          <LcarsPill rounded="right" color={theme.colors.butterscotch}>
            Right
          </LcarsPill>
        </div>
      </section>

      {/* Banner + Chip */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LcarsBanner · LcarsChip</h2>
          <span className={styles.sectionNote}>
            Title scale · Semantic color chips
          </span>
        </header>
        <div className={styles.columns}>
          <div>
            <LcarsBanner>HYPERSPANNER</LcarsBanner>
            <LcarsBanner size="compact" color={theme.colors.africanViolet}>
              Workspace · Main
            </LcarsBanner>
          </div>
          <div className={styles.row}>
            <LcarsChip variant="primary">Primary</LcarsChip>
            <LcarsChip variant="secondary">Secondary</LcarsChip>
            <LcarsChip variant="accent">Accent</LcarsChip>
            <LcarsChip variant="info">Info</LcarsChip>
            <LcarsChip variant="success">Success</LcarsChip>
            <LcarsChip variant="warning">Warning</LcarsChip>
            <LcarsChip variant="error">Error</LcarsChip>
            <LcarsChip variant="critical">Critical</LcarsChip>
            <LcarsChip interactive selected>
              Selected
            </LcarsChip>
            <LcarsChip onRemove={() => undefined}>Removable</LcarsChip>
          </div>
        </div>
      </section>

      {/* Search + command palette preview */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LcarsSearchField</h2>
          <span className={styles.sectionNote}>Command palette input</span>
        </header>
        <LcarsSearchField
          value={query}
          onChange={setQuery}
          prefix="QUERY"
          placeholder="Type a command, tool, or preset…"
          shortcut="Ctrl+K"
        />
      </section>

      {/* Split handle */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LcarsSplitHandle</h2>
          <span className={styles.sectionNote}>
            Drag or use ← → to resize ·{' '}
            <span className={styles.splitValue}>{splitPx}px</span>
          </span>
        </header>
        <div className={styles.splitDemo}>
          <div className={styles.splitPane} style={{ flex: `0 0 ${splitPx}px` }}>
            Left — {splitPx}px
          </div>
          <LcarsSplitHandle
            orientation="vertical"
            value={splitPx}
            min={120}
            max={640}
            step={12}
            onDrag={(d) => setSplitPx((s) => Math.min(640, Math.max(120, s + d)))}
            onKeyboardResize={setSplitPx}
          />
          <div className={styles.splitPane}>Right — flex</div>
        </div>
      </section>

      {/* Telemetry strip */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LcarsTelemetryLabel</h2>
          <span className={styles.sectionNote}>Bottom status strip</span>
        </header>
        <div className={styles.statusStrip}>
          <LcarsTelemetryLabel
            name="SHELL"
            value="P1"
            indicatorColor={theme.colors.green}
          />
          <LcarsTelemetryLabel name="RAM" value="642" unit="MB" />
          <LcarsTelemetryLabel name="CPU" value="4" unit="%" />
          <LcarsTelemetryLabel
            name="TOOLS"
            value="12/14"
            indicatorColor={theme.colors.butterscotch}
          />
          <LcarsTelemetryLabel
            name="MODE"
            value="DIAG"
            filled
            background={theme.colors.bluey}
          />
          <LcarsTelemetryLabel
            name="ALERT"
            value="NOMINAL"
            filled
            background={theme.colors.green}
          />
        </div>
      </section>

      {/* Authenticity checklist */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Authenticity checklist</h2>
          <span className={styles.sectionNote}>
            Per lcars-interface-designer skill
          </span>
        </header>
        <ul className={styles.verifyList}>
          <li>
            <span className={styles.verifyCheck}>●</span> Antonio typography,
            uppercase, tabular numerics
          </li>
          <li>
            <span className={styles.verifyCheck}>●</span> Right-aligned labels on
            panels and banners
          </li>
          <li>
            <span className={styles.verifyCheck}>●</span> Black seams between panels
            (0.25rem)
          </li>
          <li>
            <span className={styles.verifyCheck}>●</span> Pills use{' '}
            <code>border-radius: 100vmax</code>
          </li>
          <li>
            <span className={styles.verifyCheck}>●</span> Elbow curves on rail caps
          </li>
          <li>
            <span className={styles.verifyCheck}>●</span> Semantic color roles map per
            theme
          </li>
          <li>
            <span className={styles.verifyCheck}>●</span> Focus rings via{' '}
            <code>:focus-visible</code>
          </li>
          <li>
            <span className={styles.verifyCheck}>●</span> Reduced-motion respected in
            global.css
          </li>
        </ul>
        <div className={styles.footerHint}>
          Switch themes above to confirm every primitive re-skins via CSS variables.
        </div>
      </section>
    </div>
  );
};
