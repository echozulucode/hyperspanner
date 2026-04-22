import type { FC } from 'react';
import { HomeAutomationScreen } from './screens/HomeAutomationScreen';
import { RailElbowScreen } from './screens/RailElbowScreen';
import { SegmentedTopScreen } from './screens/SegmentedTopScreen';
import { PanelButtonStackScreen } from './screens/PanelButtonStackScreen';
import { TabClusterScreen } from './screens/TabClusterScreen';
import { TrajectoryInsetScreen } from './screens/TrajectoryInsetScreen';
import { EventLogScreen } from './screens/EventLogScreen';

/**
 * De-risk screen registry — a single source of truth for:
 *   - which screens exist
 *   - what each one demonstrates
 *   - which ones are implemented vs stubs
 *
 * See docs/plan-006-derisk-screens-and-gallery.md.
 */

export type ScreenName =
  | 'home-automation'
  | 'rail-elbow'
  | 'segmented-top'
  | 'panel-button-stack'
  | 'tab-cluster'
  | 'trajectory-inset'
  | 'event-log';

export interface ScreenEntry {
  id: ScreenName;
  title: string;
  summary: string;
  /** `undefined` → not implemented yet; hub shows it disabled. */
  Component?: FC;
  /** Optional reference image path for future /compare views. */
  referenceImage?: string;
}

export const SCREENS: readonly ScreenEntry[] = [
  {
    id: 'home-automation',
    title: 'Home Automation',
    summary:
      "Full-screen replica of the canonical LCARS-24.2 reference image — top bar, left rail with elbow corner + panel-button stack, tab cluster, event log, trajectory inset, footer bar.",
    Component: HomeAutomationScreen,
    referenceImage: '/reference-images/home-automation.png',
  },
  {
    id: 'rail-elbow',
    title: 'Rail + Elbow',
    summary:
      'Left rail + diagonal elbow corner at the join with a stub top bar. Primitive pressure test — no content, just structure.',
    Component: RailElbowScreen,
  },
  {
    id: 'segmented-top',
    title: 'Segmented Top Bar',
    summary:
      'Full-width LcarsBar at canonical proportions (brand / elbow cap / title / state / controls). Verifies seam thickness and segment widths.',
    Component: SegmentedTopScreen,
  },
  {
    id: 'panel-button-stack',
    title: 'Panel Button Stack',
    summary:
      'Vertical LIGHTS / CAMERAS / ENERGY pattern. Flat rectangular buttons with right-anchored labels — distinct from pills.',
    Component: PanelButtonStackScreen,
  },
  {
    id: 'tab-cluster',
    title: 'Tab Cluster',
    summary:
      'Row of pill tabs (SENSORS / GUAGES / WEATHER). Active tab orange, others african-violet, black seams between.',
    Component: TabClusterScreen,
  },
  {
    id: 'trajectory-inset',
    title: 'Trajectory Inset',
    summary:
      'Bordered mini-panel with SVG wireframe, right-aligned data code, and a data-cascade footer.',
    Component: TrajectoryInsetScreen,
  },
  {
    id: 'event-log',
    title: 'Event Log',
    summary:
      'Full-bleed compressed-uppercase text readout. Typography pressure test for Barlow Condensed at LCARS sizes.',
    Component: EventLogScreen,
  },
];

export function findScreen(name: string): ScreenEntry | undefined {
  return SCREENS.find((s) => s.id === (name as ScreenName));
}
