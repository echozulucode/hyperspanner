import type { FC } from 'react';
import {
  LcarsEventLog,
  LcarsPanel,
  LcarsPill,
  LcarsStandardLayout,
  type LcarsBarSegment,
  type LcarsEventLogItem,
} from '@hyperspanner/lcars-ui';
import { useTheme } from '../../../contexts/ThemeContext';
import styles from './EventLogScreen.module.css';

/**
 * EventLogScreen — de-risk showcase for LcarsEventLog with different
 * severity palettes and content densities (3-column grid layout).
 */
export const EventLogScreen: FC = () => {
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
        EVENT LOG
      </LcarsPanel>
      <LcarsPanel
        size="flex"
        color={railEndColor}
        seamless
        active={false}
        onClick={() => {}}
      >
        READOUT
      </LcarsPanel>
    </>
  );

  const navigation = (
    <LcarsPill variant="navigation" color={theme.colors.butterscotch}>
      07 LOGS
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

  // Normal traffic items
  const normalTraffic: LcarsEventLogItem[] = [
    { code: '04:12:07', text: 'SYSTEM READY', severity: 'normal' },
    { code: '06:38:22', text: 'DIAGNOSTIC PASS · NOMINAL' },
    { code: '08:15:41', text: 'ROUTINE MAINTENANCE SCHEDULED' },
    { code: '10:22:19', text: 'DATA SYNC COMPLETE' },
    { code: '12:06:33', text: 'BACKUP VERIFIED' },
    { code: 'STARDATE', text: 'OPERATIONAL STATUS GREEN' },
  ];

  // Alert stream items (mixed severity)
  const alertStream: LcarsEventLogItem[] = [
    { code: '14:47:52', text: 'TEMPERATURE SPIKE DETECTED', severity: 'alert' },
    { code: '15:09:11', text: 'PRESSURE THRESHOLD WARNING', severity: 'alert' },
    { code: '15:33:04', text: 'CRITICAL SYSTEM FAILURE · REROUTING', severity: 'critical' },
    { code: '16:01:27', text: 'AUTOMATED RECOVERY INITIATED', severity: 'alert' },
    { code: '16:45:08', text: 'SYSTEMS NOMINAL · STANDBY', severity: 'normal' },
  ];

  // Dense readout items (10+, mostly normal)
  const denseReadout: LcarsEventLogItem[] = [
    { code: '00:01:02', text: 'BOOT SEQUENCE START' },
    { code: '00:02:15', text: 'MEMORY CHECK OK' },
    { code: '00:03:44', text: 'SENSORS ONLINE' },
    { code: '00:04:18', text: 'COMM ARRAY ACTIVE' },
    { code: '00:05:09', text: 'POWER SYSTEMS STABLE' },
    { code: '00:06:31', text: 'NAVIGATIONAL SYSTEMS READY' },
    { code: '00:07:42', text: 'DOCKING BAY CLEAR', severity: 'alert' },
    { code: '00:08:54', text: 'CARGO MANIFEST LOADED' },
    { code: '00:09:16', text: 'CREW MANIFEST COMPLETE' },
    { code: '00:10:27', text: 'DEPARTURE SEQUENCE READY' },
    { code: 'SHIFT', text: 'ALL SYSTEMS GO' },
    { code: 'MONTH', text: '0 UNRESOLVED INCIDENTS' },
  ];

  return (
    <LcarsStandardLayout
      title="EVENT LOG"
      topPanels={topPanels}
      navigation={navigation}
      topRailColor={topRailColor}
      bottomRailColor={bottomRailColor}
      topBarSegments={topBarSegments}
      bottomBarSegments={bottomBarSegments}
      trim={false}
    >
      {/* ─── 3-column event log grid ────────────────────────────────── */}
      <div className={styles.gridLogs}>
        {/* Column 1: Normal Traffic */}
        <LcarsEventLog
          heading="NORMAL TRAFFIC"
          items={normalTraffic}
        />

        {/* Column 2: Alert Stream */}
        <LcarsEventLog
          heading="ALERT STREAM"
          items={alertStream}
        />

        {/* Column 3: Dense Readout */}
        <LcarsEventLog
          heading="DENSE READOUT"
          items={denseReadout}
        />
      </div>
    </LcarsStandardLayout>
  );
};

export default EventLogScreen;
