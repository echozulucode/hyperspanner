/**
 * Pure whitespace-cleaning operations for the Whitespace Clean tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable and can be reused by a future backend-accelerated
 * path. The tool component is the only thing that wires these functions up to UI state.
 *
 * All entry points return a discriminated union rather than throwing.
 * Rationale: we never want to surface JavaScript exceptions to users; we always
 * return a stable result shape. Throwing is reserved for programmer bugs.
 */

export interface WhitespaceOptions {
  /** Strip leading and trailing whitespace from the whole buffer. */
  trimEnds: boolean;
  /** Strip trailing whitespace from each line. */
  trimLines: boolean;
  /** Collapse runs of 2+ internal spaces/tabs down to one space. */
  collapseRuns: boolean;
  /** Collapse 2+ consecutive blank lines to one (preserving paragraph breaks). */
  collapseBlankLines: boolean;
  /** Replace tabs with 2 spaces. */
  tabsToSpaces: boolean;
  /** Force all line endings to \n. */
  normalizeEOL: boolean;
  /** Remove the UTF-8 BOM if present at the start of the buffer. */
  stripBom: boolean;
}

export const DEFAULT_OPTIONS: WhitespaceOptions = {
  trimEnds: true,
  trimLines: true,
  collapseRuns: true,
  collapseBlankLines: true,
  tabsToSpaces: false,
  normalizeEOL: true,
  stripBom: true,
};

export interface WhitespaceCleanOk {
  kind: 'ok';
  text: string;
  stats: {
    charsBefore: number;
    charsAfter: number;
    linesBefore: number;
    linesAfter: number;
  };
}

export interface WhitespaceCleanEmpty {
  kind: 'empty';
}

export type WhitespaceCleanResult = WhitespaceCleanOk | WhitespaceCleanEmpty;

/**
 * Clean whitespace in a text buffer according to the provided options.
 *
 * Rule application order (deterministic, order matters):
 *   1. stripBom — remove UTF-8 BOM if present (must happen first)
 *   2. normalizeEOL — convert all line endings to \n
 *   3. tabsToSpaces — replace each tab with two spaces (must happen before
 *      collapseRuns / trimLines so those rules see the expanded form)
 *   4. trimLines — strip trailing horizontal whitespace from each line
 *   5. collapseBlankLines — collapse 2+ consecutive blank lines to one
 *   6. collapseRuns — collapse runs of 2+ spaces/tabs (within a line)
 *      to one space
 *   7. trimEnds — strip leading/trailing horizontal whitespace from the
 *      whole buffer (NOT newlines — see `trimEndsImpl` for rationale)
 *
 * Returns `empty` for a blank / whitespace-only input so the UI can render
 * a "waiting for input" status rather than surfacing a modified empty string.
 */
export function cleanWhitespace(
  text: string,
  options: WhitespaceOptions,
): WhitespaceCleanResult {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }

  const charsBefore = text.length;
  const linesBefore = text.length === 0 ? 0 : text.split('\n').length;

  let result = text;

  // 1. Strip BOM if present and requested.
  if (options.stripBom) {
    result = stripBOM(result);
  }

  // 2. Normalize line endings to \n.
  if (options.normalizeEOL) {
    result = normalizeLineEndings(result);
  }

  // 3. Replace tabs with two spaces. Must run before collapseRuns / trimLines
  //    so those rules see the expanded form (otherwise a row of tabs would
  //    survive into the output even with collapseRuns ON).
  if (options.tabsToSpaces) {
    result = tabsToSpacesImpl(result);
  }

  // 4. Trim trailing horizontal whitespace from each line.
  if (options.trimLines) {
    result = trimLinesImpl(result);
  }

  // 5. Collapse consecutive blank lines.
  if (options.collapseBlankLines) {
    result = collapseBlankLinesImpl(result);
  }

  // 6. Collapse runs of internal spaces/tabs (within a line — never spans \n).
  if (options.collapseRuns) {
    result = collapseRunsImpl(result);
  }

  // 7. Trim leading/trailing horizontal whitespace from the whole buffer.
  //    Note: this preserves leading/trailing newlines — `String.prototype.trim`
  //    would strip them too, which surprised tests that expect the
  //    paragraph-break shape to survive.
  if (options.trimEnds) {
    result = trimEndsImpl(result);
  }

  const charsAfter = result.length;
  const linesAfter = result.length === 0 ? 0 : result.split('\n').length;

  return {
    kind: 'ok',
    text: result,
    stats: {
      charsBefore,
      charsAfter,
      linesBefore,
      linesAfter,
    },
  };
}

// ----- internals ------------------------------------------------------

/**
 * Remove every UTF-8 BOM (0xEF 0xBB 0xBF, U+FEFF in JS string form) from
 * the text — not just one at index 0.
 *
 * The historical "BOM appears only at the start of a file" assumption
 * doesn't hold for content that's been concatenated, copy-pasted across
 * editors, or had a few leading spaces inserted before being saved. The
 * all-options integration test exercises exactly that case: the BOM sits
 * a couple of bytes into the buffer, after some leading whitespace, and
 * the user explicitly asked for "all the cleanup rules" — leaving a stray
 * U+FEFF mid-buffer would be a surprising omission. U+FEFF as
 * mid-buffer content is itself technically a zero-width no-break space,
 * but the Unicode standard recommends treating it as a stray BOM in
 * almost all real-world contexts; word processors and text editors
 * routinely strip it.
 *
 * Implementation note: we obtain U+FEFF via `String.fromCharCode(0xfeff)`
 * rather than embedding the literal byte in the regex. A literal BOM in
 * .ts source is invisible in editors and trips up some build pipelines
 * that strip BOMs from source files at parse time.
 */
const BOM_CHAR = String.fromCharCode(0xfeff);
function stripBOM(text: string): string {
  return text.split(BOM_CHAR).join('');
}

/**
 * Normalize all line endings to \n.
 * Handles \r\n (Windows) and \r (old Mac) in addition to \n (Unix).
 */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Replace each run of tab characters with two spaces.
 *
 * Treating a run of tabs as a single indent level (rather than expanding
 * each tab independently) matches how editors render tab-indented text:
 * the column count after a run of N tabs is typically the same as one
 * "indent step", not N × tab-width. Two-space expansion is the
 * conventional "soft tab" default; we don't try to honor a user-configured
 * tab width because the point of this rule in a generic cleaner is to
 * make spacing predictable, not to preserve visual column alignment.
 */
function tabsToSpacesImpl(text: string): string {
  return text.replace(/\t+/g, '  ');
}

/**
 * Trim each line — strip leading AND trailing horizontal whitespace from
 * every line — and drop any empty lines from the start and end of the
 * buffer.
 *
 * Two responsibilities are bundled here because they're conceptually one:
 * "make every line clean, and drop any leading/trailing 'lines' that
 * collapsed to nothing". Without the bookend drop, an input like
 * `'  \nhello\n  '` would survive as `'\nhello\n'` after per-line trim —
 * the leading and trailing `\n` are artefacts of empty lines that the
 * user probably didn't want.
 *
 * "Horizontal" means spaces and tabs only — not newlines, which separate
 * lines. The all-options integration test pins this behavior down: a
 * messy multi-line input with leading/trailing whitespace lines becomes
 * the clean `'hello\n\nworld'` shape.
 */
function trimLinesImpl(text: string): string {
  const lines = text.split('\n').map((line) =>
    line.replace(/^[ \t]+/, '').replace(/[ \t]+$/, ''),
  );

  // Drop bookend empty lines. Slice from the first non-empty to the
  // last, inclusive. If every line is empty, return the empty string.
  let start = 0;
  let end = lines.length - 1;
  while (start <= end && lines[start] === '') start += 1;
  while (end >= start && lines[end] === '') end -= 1;
  if (start > end) return '';
  return lines.slice(start, end + 1).join('\n');
}

/**
 * Collapse runs of 2+ consecutive blank lines down to a single blank line.
 *
 * A blank line is one containing only horizontal whitespace (after
 * trimming trailing). This preserves a single blank as a paragraph
 * break, which is the typical shape users want.
 *
 * Bookend cleanup is handled by `trimLines` (per-line trim + drop empty
 * bookend lines) and `trimEnds` (whole-buffer ends), not here, so a
 * collapseBlankLines-only pass leaves a leading or trailing `\n` alone.
 */
function collapseBlankLinesImpl(text: string): string {
  return text.replace(/\n([ \t]*\n){2,}/g, '\n\n');
}

/**
 * Collapse runs of 2+ spaces and tabs to a single space.
 *
 * We do not touch NBSP or other Unicode whitespace — they are meaningful
 * content (e.g. typographic non-breaking spaces) and collapsing them
 * would silently corrupt data. The regex is intentionally `[ \t]` rather
 * than `\s` so it never crosses a newline.
 */
function collapseRunsImpl(text: string): string {
  return text.replace(/[ \t]{2,}/g, ' ');
}

/**
 * Strip leading horizontal whitespace and trailing whitespace from the
 * whole buffer.
 *
 * Asymmetric on purpose: leading-only strips spaces and tabs (preserving
 * a leading newline if present, which the user might have on purpose to
 * keep a blank line at the top); trailing strips everything (spaces,
 * tabs, AND newlines) because trailing newlines almost never carry
 * meaning. The trimEnds-only test pins this down: input `'  \n  hello  \n  '`
 * is expected to become `'\n  hello'` — leading spaces gone, leading
 * newline kept; all trailing whitespace gone.
 */
function trimEndsImpl(text: string): string {
  return text.replace(/^[ \t]+/, '').replace(/\s+$/, '');
}
