/**
 * LCARS Picard-Modern Theme — Hyperspanner default
 *
 * Restrained, productivity-console palette per
 * docs/plan-001-lcars-approach-research.md §"Color usage":
 *
 *   - deep charcoal background (not pure black)
 *   - muted salmon/orange rails
 *   - dusty purple secondary rails
 *   - beige/sand text for labels
 *   - pale cyan only for active telemetry or success states
 *   - red used sparingly for errors
 *
 * LCARS shell identity preserved, color noise cut so long sessions
 * stay readable. This is the variant the `lcars-interface-designer`
 * skill calls `picard-modern`.
 */

import { classicTheme } from './classic';

export const picardModernTheme = {
  ...classicTheme,
  name: 'picard-modern' as const,

  colors: {
    ...classicTheme.colors,

    // Muted salmon / orange — primary shell bands
    orange: '#d88463',
    goldenOrange: '#c97a58',
    gold: '#d9a36a',
    butterscotch: '#c9885f',
    peach: '#e6a18a',
    almond: '#c99a83',
    almondCreme: '#d7a99a',
    sunflower: '#d8b48a',

    // Dusty purple — secondary shell bands
    africanViolet: '#8a7aa8',
    lilac: '#8f6fb0',
    moonlitViolet: '#7d6fa8',
    violetCreme: '#a896c0',
    magenta: '#a06a8d',

    // Blues — restrained
    blue: '#5a6a96',
    bluey: '#6c7fa6',
    sky: '#7e8bad',
    ice: '#8ea6c0',

    // Accents — used sparingly
    mars: '#c85a3a',
    red: '#b85050',
    tomato: '#c65a5a',
    green: '#7a9a6f',
    limaBean: '#a6a676',
    gray: '#5c5f70',

    // Neutral surfaces (not in classic but required by picard-modern)
    spaceWhite: '#eae4d6',

    // Functional
    background: '#0a0a0f',
    text: '#eae4d6',
    textLight: '#f5f2ea',
    textDark: '#0a0a0f',

    // Component defaults — map the role, not the literal color
    panelDefault: '#d88463',
    buttonDefault: '#8a7aa8',
    barDefault: '#6c7fa6',
  },
} as const;

export type PicardModernTheme = typeof picardModernTheme;
