import { useState } from 'react';
import type { FC } from 'react';
import {
  LcarsPanel,
  LcarsPill,
  LcarsStandardLayout,
  LcarsTabCluster,
  LcarsTabPill,
  type LcarsBarSegment,
} from '@hyperspanner/lcars-ui';
import { useTheme } from '../../../contexts/ThemeContext';
import styles from './TabClusterScreen.module.css';

type Tab2Id = 'active' | 'standby';
type Tab3Id = 'sensors' | 'gauges' | 'weather';
type Tab5Id = 'nav' | 'tactical' | 'comms' | 'ops' | 'med';

/**
 * TabClusterScreen — de-risk showcase for LcarsTabCluster + LcarsTabPill
 * at multiple sizes (2-tab, 3-tab, 5-tab configurations).
 */
export const TabClusterScreen: FC = () => {
  const { theme } = useTheme();
  const [activeTab2, setActiveTab2] = useState<Tab2Id>('active');
  const [activeTab3, setActiveTab3] = useState<Tab3Id>('sensors');
  const [activeTab5, setActiveTab5] = useState<Tab5Id>('nav');

  const railEndColor = theme.colors.orange;

  const topPanels = (
    <>
      <LcarsPanel
        size="flex"
        color={theme.colors.butterscotch}
        active={true}
        onClick={() => {}}
      >
        TAB CLUSTER
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
      03 TABS
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
      title="TAB CLUSTER"
      topPanels={topPanels}
      navigation={navigation}
      topRailColor={topRailColor}
      bottomRailColor={bottomRailColor}
      topBarSegments={topBarSegments}
      bottomBarSegments={bottomBarSegments}
      trim={false}
    >
      {/* ─── 2-TAB CLUSTER ──────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>2-TAB CLUSTER</h2>
        <LcarsTabCluster>
          <LcarsTabPill
            label="ACTIVE"
            color={theme.colors.butterscotch}
            active={activeTab2 === 'active'}
            onClick={() => setActiveTab2('active')}
          />
          <LcarsTabPill
            label="STANDBY"
            color={theme.colors.africanViolet}
            active={activeTab2 === 'standby'}
            onClick={() => setActiveTab2('standby')}
          />
        </LcarsTabCluster>
      </div>

      {/* ─── 3-TAB CLUSTER ──────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>3-TAB CLUSTER</h2>
        <LcarsTabCluster>
          <LcarsTabPill
            label="SENSORS"
            color={theme.colors.butterscotch}
            active={activeTab3 === 'sensors'}
            onClick={() => setActiveTab3('sensors')}
          />
          <LcarsTabPill
            label="GAUGES"
            color={theme.colors.africanViolet}
            active={activeTab3 === 'gauges'}
            onClick={() => setActiveTab3('gauges')}
          />
          <LcarsTabPill
            label="WEATHER"
            color={theme.colors.orange}
            active={activeTab3 === 'weather'}
            onClick={() => setActiveTab3('weather')}
          />
        </LcarsTabCluster>
      </div>

      {/* ─── 5-TAB CLUSTER ──────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>5-TAB CLUSTER</h2>
        <LcarsTabCluster>
          <LcarsTabPill
            label="NAV"
            color={theme.colors.butterscotch}
            active={activeTab5 === 'nav'}
            onClick={() => setActiveTab5('nav')}
          />
          <LcarsTabPill
            label="TACTICAL"
            color={theme.colors.africanViolet}
            active={activeTab5 === 'tactical'}
            onClick={() => setActiveTab5('tactical')}
          />
          <LcarsTabPill
            label="COMMS"
            color={theme.colors.orange}
            active={activeTab5 === 'comms'}
            onClick={() => setActiveTab5('comms')}
          />
          <LcarsTabPill
            label="OPS"
            color={theme.colors.red}
            active={activeTab5 === 'ops'}
            onClick={() => setActiveTab5('ops')}
          />
          <LcarsTabPill
            label="MED"
            color={theme.colors.butterscotch}
            active={activeTab5 === 'med'}
            onClick={() => setActiveTab5('med')}
          />
        </LcarsTabCluster>
      </div>
    </LcarsStandardLayout>
  );
};

export default TabClusterScreen;
