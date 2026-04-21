/**
 * @hyperspanner/lcars-ui
 *
 * Primitive components and design tokens for the Hyperspanner shell.
 * Phase 1 exports: structural primitives that the AppShell (Phase 2)
 * and tools (Phase 6) compose. Data-visualization primitives
 * (LcarsTable, LcarsSparkline, LcarsGauge, LcarsChart, LcarsDataCascade)
 * are deferred to Phase 6 where their consumers are built.
 */

export * from './tokens';

export { LcarsBar } from './primitives/LcarsBar';
export type { LcarsBarProps, LcarsBarSegment } from './primitives/LcarsBar/LcarsBar';

export { LcarsBanner } from './primitives/LcarsBanner';
export type { LcarsBannerProps } from './primitives/LcarsBanner/LcarsBanner';

export { LcarsPill } from './primitives/LcarsPill';
export type {
  LcarsPillProps,
  PillRounded,
  PillSize,
  PillVariant,
} from './primitives/LcarsPill';

export { LcarsPanel } from './primitives/LcarsPanel';
export type { LcarsPanelProps } from './primitives/LcarsPanel';

export { LcarsChip } from './primitives/LcarsChip';
export type { LcarsChipProps, ChipSize } from './primitives/LcarsChip';

export { LcarsTabs } from './primitives/LcarsTabs';
export type { LcarsTab, LcarsTabsProps, TabsOrientation } from './primitives/LcarsTabs';

export { LcarsRail } from './primitives/LcarsRail';
export type { LcarsRailProps, RailWidth } from './primitives/LcarsRail';

export { LcarsZoneHeader } from './primitives/LcarsZoneHeader';
export type { LcarsZoneHeaderProps } from './primitives/LcarsZoneHeader';

export { LcarsCommandBar } from './primitives/LcarsCommandBar';
export type {
  LcarsCommandBarProps,
  CommandBarAlign,
} from './primitives/LcarsCommandBar';

export { LcarsSearchField } from './primitives/LcarsSearchField';
export type { LcarsSearchFieldProps } from './primitives/LcarsSearchField';

export { LcarsEmptyState } from './primitives/LcarsEmptyState';
export type { LcarsEmptyStateProps } from './primitives/LcarsEmptyState';

export { LcarsSplitHandle } from './primitives/LcarsSplitHandle';
export type {
  LcarsSplitHandleProps,
  SplitOrientation,
} from './primitives/LcarsSplitHandle';

export { LcarsTelemetryLabel } from './primitives/LcarsTelemetryLabel';
export type {
  LcarsTelemetryLabelProps,
  TelemetrySize,
} from './primitives/LcarsTelemetryLabel';
