/**
 * LCARS Classic Theme
 * Authentic TNG/Voyager color palette (LCARS-24.2 values).
 */

export const classicTheme = {
  name: 'classic' as const,

  colors: {
    // Core LCARS Colors (exact values from LCARS-24.2)
    africanViolet: '#cc99ff',
    almond: '#ffaa90',
    almondCreme: '#ffbbaa',
    blue: '#5566ff',
    bluey: '#8899ff',
    butterscotch: '#ff9966',
    gold: '#ffaa00',
    goldenOrange: '#ff9900',
    gray: '#666688',
    green: '#999933',
    ice: '#99ccff',
    lilac: '#cc55ff',
    limaBean: '#cccc66',
    magenta: '#cc5599',
    mars: '#ff2200',
    moonlitViolet: '#9966ff',
    orange: '#ff8800',
    peach: '#ff8866',
    red: '#cc4444',
    sky: '#aaaaff',
    spaceWhite: '#f5f6fa',
    sunflower: '#ffcc99',
    tomato: '#ff5555',
    violetCreme: '#ddbbff',

    // Functional colors
    background: '#000000',
    text: '#cc99ff',
    textLight: '#ffffff',
    textDark: '#000000',

    // Component defaults
    panelDefault: '#cc4444',
    buttonDefault: '#cc99ff',
    barDefault: '#8899ff',
  },

  spacing: {
    panelBorder: '0.25rem solid black',
    barBorder: '0.25rem solid black',
    leftFrameWidth: '240px',
    leftFramePadding: '0.75rem',
    barHeight: '28px',
    dividerHeight: '0.5rem',
    radiusTop: '0 0 0 160px',
    radiusBottom: '160px 0 0 0',
    radiusContentTop: '0 0 0 60px',
    radiusContentBottom: '60px 0 0 0',
  },

  breakpoints: {
    xl: '1500px',
    lg: '1300px',
    md: '950px',
    sm: '750px',
    xs: '525px',
    xxs: '450px',
  },

  typography: {
    fontFamily: "'Antonio', 'Arial Narrow', 'Avenir Next Condensed', sans-serif",
    fontWeight: {
      normal: 400,
      bold: 700,
    },
    fontSize: {
      base: '1.375rem',
      sub: '0.875rem',
      dataCascade: '0.875rem',
      h1: 'clamp(1.5rem, 1.25rem + 3.5vw, 4rem)',
      h2: 'clamp(1.4rem, 1.1rem + 2.25vw, 2.3rem)',
      h3: 'clamp(1.15rem, 1.05rem + 1.25vw, 1.875rem)',
      h4: 'clamp(1.025rem, 1rem + 1.125vw, 1.575rem)',
      banner: 'clamp(1.25rem, 0.75rem + 4vw, 4rem)',
    },
  },

  animations: {
    dataCascadeSpeed: '6000ms',
    blinkSlow: '3500ms',
    blink: '2000ms',
    blinkFast: '1000ms',
    pulse: '2000ms',
  },
} as const;

export type ClassicTheme = typeof classicTheme;
