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
 * Structural theme shape — every variant conforms to this.
 * We use the classic theme as the canonical shape because
 * every other variant spreads from it.
 */
export type LcarsTheme = typeof classicTheme;

export type ClassicTheme = typeof classicTheme;
export type NemesisBlueTheme = typeof nemesisBlueTheme;
export type LowerDecksTheme = typeof lowerDecksTheme;
export type PicardModernTheme = typeof picardModernTheme;
