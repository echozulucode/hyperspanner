// @vitest-environment jsdom
import { describe, it } from 'vitest';

/**
 * Orphan test file — see the matching note in `PresetSelector.tsx`.
 * The preset feature was removed; this file survives only because the
 * cowork sandbox doesn't permit deletion. A single skipped placeholder
 * keeps the file syntactically valid and makes the orphan obvious in
 * the test output.
 */

describe.skip('PresetSelector (removed)', () => {
  it('is no longer part of the app', () => {
    // Intentionally empty — see file header.
  });
});
