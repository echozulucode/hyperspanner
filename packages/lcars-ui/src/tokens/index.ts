/**
 * Design tokens exposed as CSS custom property names.
 *
 * The ThemeContext in the host app (`apps/desktop`) injects the actual
 * values. Primitives consume these token names either via CSS Modules
 * (resolved through `var(--lcars-color-*)`) or by passing a token
 * identifier through props. Keeping the token source-of-truth here
 * lets the package stay framework-pure while the app owns theming.
 */

export const lcarsColor = {
  orange: 'var(--lcars-color-orange)',
  goldenOrange: 'var(--lcars-color-golden-orange)',
  gold: 'var(--lcars-color-gold)',
  butterscotch: 'var(--lcars-color-butterscotch)',
  peach: 'var(--lcars-color-peach)',
  almond: 'var(--lcars-color-almond)',
  almondCreme: 'var(--lcars-color-almond-creme)',
  sunflower: 'var(--lcars-color-sunflower)',

  africanViolet: 'var(--lcars-color-african-violet)',
  lilac: 'var(--lcars-color-lilac)',
  moonlitViolet: 'var(--lcars-color-moonlit-violet)',
  violetCreme: 'var(--lcars-color-violet-creme)',
  magenta: 'var(--lcars-color-magenta)',

  blue: 'var(--lcars-color-blue)',
  bluey: 'var(--lcars-color-bluey)',
  sky: 'var(--lcars-color-sky)',
  ice: 'var(--lcars-color-ice)',

  mars: 'var(--lcars-color-mars)',
  red: 'var(--lcars-color-red)',
  tomato: 'var(--lcars-color-tomato)',
  green: 'var(--lcars-color-green)',
  limaBean: 'var(--lcars-color-lima-bean)',
  gray: 'var(--lcars-color-gray)',
  spaceWhite: 'var(--lcars-color-space-white)',

  background: 'var(--lcars-color-background)',
  text: 'var(--lcars-color-text)',
  textLight: 'var(--lcars-color-text-light)',
  textDark: 'var(--lcars-color-text-dark)',
} as const;

export type LcarsColorToken = keyof typeof lcarsColor;

export const lcarsSpacing = {
  seam: 'var(--lcars-spacing-panel-border, 0.25rem solid black)',
  barBorder: 'var(--lcars-spacing-bar-border, 0.25rem solid black)',
  leftFrameWidth: 'var(--lcars-spacing-left-frame-width, 240px)',
  leftFramePadding: 'var(--lcars-spacing-left-frame-padding, 0.75rem)',
  barHeight: 'var(--lcars-spacing-bar-height, 28px)',
  radiusTop: 'var(--lcars-spacing-radius-top, 0 0 0 160px)',
  radiusBottom: 'var(--lcars-spacing-radius-bottom, 160px 0 0 0)',
} as const;

/**
 * Semantic roles — each primitive maps variants to these rather than
 * naming raw colors. Variants are re-mapped per theme; e.g. `primary`
 * is muted-salmon under picard-modern, bright orange under classic.
 */
export type LcarsSemanticRole =
  | 'primary' // dominant framing (rails, banners)
  | 'secondary' // secondary framing (accent bands)
  | 'accent' // active/focused elements
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'critical'
  | 'neutral';

export const semanticToToken: Record<LcarsSemanticRole, LcarsColorToken> = {
  primary: 'orange',
  secondary: 'africanViolet',
  accent: 'butterscotch',
  info: 'bluey',
  success: 'green',
  warning: 'butterscotch',
  error: 'red',
  critical: 'mars',
  neutral: 'gray',
};

export function semanticVar(role: LcarsSemanticRole): string {
  return lcarsColor[semanticToToken[role]];
}
