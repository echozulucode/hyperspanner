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
 *   3. trimLines — strip trailing whitespace from each line
 *   4. collapseBlankLines — collapse 2+ consecutive blank lines to one
 *   5. collapseRuns — collapse runs of 2+ spaces/tabs to one space
 *   6. trimEnds — strip leading/trailing whitespace from whole buffer
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

  // 3. Trim trailing whitespace from each line.
  if (options.trimLines) {
    result = trimLinesImpl(result);
  }

  // 4. Collapse consecutive blank lines.
  if (options.collapseBlankLines) {
    result = collapseBlankLinesImpl(result);
  }

  // 5. Collapse runs of internal spaces/tabs.
  if (options.collapseRuns) {
    result = collapseRunsImpl(result);
  }

  // 6. Trim leading/trailing whitespace from the whole buffer.
  if (options.trimEnds) {
    result = result.trim();
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
 * Remove the UTF-8 BOM (0xEF 0xBB 0xBF) from the start of a string if present.
 * In JavaScript strings, the BOM appears as the character U+FEFF.
 */
function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/**
 * Normalize all line endings to \n.
 * Handles \r\n (Windows) and \r (old Mac) in addition to \n (Unix).
 */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Strip trailing whitespace from each line.
 * Lines are split by \n, then each has trailing spaces/tabs removed.
 */
function trimLinesImpl(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n');
}

/**
 * Collapse 2+ consecutive blank lines to one.
 * A blank line is one containing only whitespace (after trimming trailing).
 * This preserves the blank line itself (useful for paragraph breaks).
 */
function collapseBlankLinesImpl(text: string): string {
  return text.replace(/\n([ \t]*\n){2,}/g, '\n\n');
}

/**
 * Collapse runs of 2+ internal spaces and tabs to a single space.
 * "Internal" means not at line start or end (we handle those separately).
 * We do not touch NBSP or other Unicode whitespace by default — they are
 * meaningful content and collapsing them would silently corrupt data.
 */
function collapseRunsImpl(text: string): string {
  return text.replace(/[ \t]{2,}/g, ' ');
}
