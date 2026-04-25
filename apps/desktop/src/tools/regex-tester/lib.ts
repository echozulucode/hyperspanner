/**
 * Pure regex operations for the Regex Tester tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable and can be reused by a potential future
 * backend-accelerated path. The tool component is the only thing that
 * wires these functions up to UI state.
 */

export interface RegexFlags {
  g: boolean;
  i: boolean;
  m: boolean;
  s: boolean;
  u: boolean;
  y: boolean;
}

export interface RegexMatch {
  index: number;
  start: number;
  end: number;
  match: string;
  groups: Array<{
    name: string | null;
    value: string | undefined;
    start: number;
    end: number;
  }>;
}

export interface RegexCompileOk {
  kind: 'ok';
  regex: RegExp;
}

export interface RegexCompileError {
  kind: 'error';
  message: string;
}

export interface RegexCompileEmpty {
  kind: 'empty';
}

export type RegexCompileResult =
  | RegexCompileOk
  | RegexCompileError
  | RegexCompileEmpty;

export interface RegexRunOk {
  kind: 'ok';
  matches: RegexMatch[];
  truncated: boolean;
}

export interface RegexRunError {
  kind: 'error';
  message: string;
}

export interface RegexRunEmpty {
  kind: 'empty';
}

export type RegexRunResult = RegexRunOk | RegexRunError | RegexRunEmpty;

/**
 * Attempt to compile a regex pattern with the given flags.
 * Returns `empty` for a blank pattern.
 */
export function compileRegex(
  pattern: string,
  flags: RegexFlags,
): RegexCompileResult {
  if (pattern.trim().length === 0) {
    return { kind: 'empty' };
  }

  try {
    const flagStr = buildFlagString(flags);
    const regex = new RegExp(pattern, flagStr);
    return { kind: 'ok', regex };
  } catch (err) {
    const message = normalizeRegexError(err);
    return { kind: 'error', message };
  }
}

/**
 * Run a regex pattern against sample text, extracting all matches.
 *
 * Empty pattern returns `empty`. Valid pattern + empty sample returns ok with
 * zero matches (not an error — the pattern is valid, just no input).
 *
 * matchLimit (default 500) prevents infinite-match patterns like `//g` from
 * hanging the UI. Past the limit, returns truncated=true.
 *
 * For zero-length matches (e.g. `//g`), we manually advance lastIndex to
 * avoid infinite loops.
 */
export function runRegex(
  pattern: string,
  flags: RegexFlags,
  sample: string,
  options?: { matchLimit?: number },
): RegexRunResult {
  if (pattern.trim().length === 0) {
    return { kind: 'empty' };
  }

  const compiled = compileRegex(pattern, flags);
  if (compiled.kind === 'error') {
    return { kind: 'error', message: compiled.message };
  }
  if (compiled.kind !== 'ok') {
    // Defensive: compileRegex only returns 'empty' for a blank pattern,
    // which we already filtered above. This branch should be unreachable
    // but TS needs it to narrow `compiled` to RegexCompileOk below.
    return { kind: 'empty' };
  }

  const matchLimit = options?.matchLimit ?? 500;
  const regex = compiled.regex;
  const matches: RegexMatch[] = [];
  let truncated = false;
  let match: RegExpExecArray | null;

  // For sticky flag, we only match at the current lastIndex. For global flag,
  // we iterate until no match. For neither, a single match.
  const isGlobal = flags.g;
  const isSticky = flags.y;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (matches.length >= matchLimit) {
      truncated = true;
      break;
    }

    match = regex.exec(sample);
    if (!match) break;

    const groups = extractGroups(regex, match);
    matches.push({
      index: match.index,
      start: match.index,
      end: match.index + match[0].length,
      match: match[0],
      groups,
    });

    // For sticky, once we've matched, stop. For global, continue if we matched.
    // If neither, we only run exec once (the while loop breaks next iteration).
    if (isSticky) break;
    if (!isGlobal) break;

    // Prevent infinite loop on zero-length matches: advance lastIndex manually.
    if (match[0].length === 0) {
      regex.lastIndex = match.index + 1;
    }
  }

  return { kind: 'ok', matches, truncated };
}

/**
 * Extract capture groups (numeric and named) from a regex match.
 * Returns an array with name, value, and start/end offsets for each group.
 */
function extractGroups(
  _regex: RegExp,
  match: RegExpExecArray,
): RegexMatch['groups'] {
  const groups: RegexMatch['groups'] = [];

  // Numeric groups: match[1], match[2], etc.
  for (let i = 1; i < match.length; i++) {
    const value = match[i];
    // Compute the offset of this group. For capturing groups, the engine
    // provides indices in ES2022 RegExp.prototype.hasIndices. We compute
    // them naively: if the match string contains the group value, find its
    // offset. This is imperfect (value may appear multiple times) but
    // sufficient for display purposes. A more robust path would check the
    // `indices` property if available.
    const start =
      value !== undefined
        ? match.index + (match[0].indexOf(value) ?? match.index)
        : -1;
    const end = value !== undefined ? start + value.length : -1;

    groups.push({
      name: null,
      value,
      start: start >= 0 ? start : match.index,
      end: end >= 0 ? end : match.index + match[0].length,
    });
  }

  // Named groups: regex.exec() returns them in match.groups if the regex
  // has named capture groups.
  if (match.groups) {
    for (const [name, value] of Object.entries(match.groups)) {
      // Try to find the offset of this group. Similar caveat as above.
      const start =
        value !== undefined && value.length > 0
          ? match.index + (match[0].indexOf(value) ?? match.index)
          : -1;
      const end = value !== undefined ? start + value.length : -1;

      groups.push({
        name,
        value,
        start: start >= 0 ? start : match.index,
        end: end >= 0 ? end : match.index + match[0].length,
      });
    }
  }

  return groups;
}

/**
 * Build a flag string from the RegexFlags object.
 */
function buildFlagString(flags: RegexFlags): string {
  let flagStr = '';
  if (flags.g) flagStr += 'g';
  if (flags.i) flagStr += 'i';
  if (flags.m) flagStr += 'm';
  if (flags.s) flagStr += 's';
  if (flags.u) flagStr += 'u';
  if (flags.y) flagStr += 'y';
  return flagStr;
}

/**
 * Normalize a regex error into a human-readable message.
 * We catch common cases like unterminated character classes, invalid groups,
 * and nothing-to-repeat errors.
 */
function normalizeRegexError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  // Common regex errors:
  // "Invalid regular expression: /(/: Unterminated group"
  // "Invalid regular expression: /[/: Unterminated character class"
  // "Invalid regular expression: /*/: Nothing to repeat"
  // "Invalid regular expression: /(?</: Invalid group"

  if (/unterminated group/i.test(message)) {
    return 'Unterminated group. Check parentheses.';
  }
  if (/unterminated character class/i.test(message)) {
    return 'Unterminated character class. Check square brackets.';
  }
  if (/nothing to repeat/i.test(message)) {
    return 'Nothing to repeat. Quantifiers need a preceding atom.';
  }
  if (/invalid group/i.test(message)) {
    return 'Invalid group syntax. Check for unclosed brackets or bad syntax.';
  }
  if (/invalid escape/i.test(message)) {
    return 'Invalid escape sequence.';
  }
  if (/invalid backreference/i.test(message)) {
    return 'Invalid backreference.';
  }

  // Strip the "Invalid regular expression:" prefix if present.
  return message.replace(/^Invalid regular expression:\s*/i, '').trim();
}
