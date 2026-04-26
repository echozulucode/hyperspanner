/**
 * Orphan file — the layout-preset feature was removed entirely on
 * 2026-04-26. The user found preset switching unhelpful as a daily-use
 * control and asked for the dropdown removed; subsequent cleanup
 * stripped `LAYOUT_PRESETS` / `applyPreset` / `findPreset` from the
 * workspace store and surfaces. This file is no longer referenced
 * anywhere.
 *
 * The cowork session sandbox doesn't permit `rm` on the workspace
 * mount, so this file (and its sibling `.module.css` / `.test.tsx`)
 * survives as an empty stub until the user deletes them by hand.
 * Empty stub keeps `tsc -b --noEmit` clean — it's lighter than a
 * lint-erroring stale import or an `export const x: never = ...`
 * placeholder.
 */
export {};
