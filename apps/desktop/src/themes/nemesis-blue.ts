/**
 * LCARS Nemesis Blue Theme
 * Blue-gray color scheme from Star Trek: Nemesis era.
 */

import { classicTheme } from './classic';

export const nemesisBlueTheme = {
  ...classicTheme,
  name: 'nemesis-blue' as const,

  colors: {
    ...classicTheme.colors,

    africanViolet: '#5588cc',
    almond: '#88aacc',
    almondCreme: '#99bbdd',
    bluey: '#6699cc',
    butterscotch: '#88aacc',
    orange: '#5588bb',
    red: '#4477aa',

    background: '#000000',
    text: '#6699cc',
    textLight: '#ffffff',
    textDark: '#000000',

    panelDefault: '#5588cc',
    buttonDefault: '#6699cc',
    barDefault: '#6699cc',
  },
} as const;

export type NemesisBlueTheme = typeof nemesisBlueTheme;
