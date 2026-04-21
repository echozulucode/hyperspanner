import { classicTheme } from './classic';
import { nemesisBlueTheme } from './nemesis-blue';
import { lowerDecksTheme } from './lower-decks';
import { picardModernTheme } from './picard-modern';

export { classicTheme } from './classic';
export { nemesisBlueTheme } from './nemesis-blue';
export { lowerDecksTheme } from './lower-decks';
export { picardModernTheme } from './picard-modern';

export const themes = {
  'picard-modern': picardModernTheme,
  classic: classicTheme,
  'nemesis-blue': nemesisBlueTheme,
  'lower-decks': lowerDecksTheme,
} as const;

export type ThemeName = keyof typeof themes;

/**
 * Structural theme shape — the union of every variant. Using a union
 * (rather than a single variant's `typeof`) lets `name` stay as the
 * full `ThemeName` literal union instead of collapsing to `"classic"`,
 * which previously made `themes[themeName]` unassignable to `LcarsTheme`.
 */
export type LcarsTheme = (typeof themes)[ThemeName];

export type ClassicTheme = typeof classicTheme;
export type NemesisBlueTheme = typeof nemesisBlueTheme;
export type LowerDecksTheme = typeof lowerDecksTheme;
export type PicardModernTheme = typeof picardModernTheme;
