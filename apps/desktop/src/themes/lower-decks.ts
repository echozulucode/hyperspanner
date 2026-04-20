/**
 * LCARS Lower Decks Theme
 * Vibrant color scheme from Star Trek: Lower Decks.
 */

import { classicTheme } from './classic';

export const lowerDecksTheme = {
  ...classicTheme,
  name: 'lower-decks' as const,

  colors: {
    ...classicTheme.colors,

    arcticIce: '#99ffff',
    nightRain: '#6666aa',
    alphaBlue: '#4488ff',
    radioactive: '#88ff00',

    text: '#88ff00',

    panelDefault: '#88ff00',
    buttonDefault: '#99ffff',
    barDefault: '#4488ff',
  },
} as const;

export type LowerDecksTheme = typeof lowerDecksTheme;
