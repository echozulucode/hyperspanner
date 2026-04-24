/**
 * Pure JSON operations for the JSON Validator tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable and can be reused by a potential future
 * backend-accelerated path (e.g. validating a 200 MB JSON blob against a
 * schema via a Rust command). The tool component is the only thing that
 * wires these functions up to UI state.
 *
 * All three entry points return a *discriminated union* rather than
 * throwing. Rationale: JSON.parse's `SyntaxError` has a platform-
 * inconsistent message format (V8 vs. SpiderMonkey vs. JavaScriptCore all
 * phrase the same error differently) and loses the byte offset to a
 * substring at best. We normalize that here so the UI gets a stable
 * `{ line, column, offset, message }` shape on any runtime.
 */

export interface JsonValidateOk {
  kind: 'ok';
  /** Parsed value. Typed as `unknown` because JSON input is untrusted. */
  value: unknown;
}

export interface JsonValidateError {
  kind: 'error';
  /** Normalized, human-readable error message. */
  message: string;
  /** 1-based line number of the first bad byte, or `null` if unavailable. */
  line: number | null;
  /** 1-based column within that line, or `null` if unavailable. */
  column: number | null;
  /** 0-based byte offset into `text`, or `null` if unavailable. */
  offset: number | null;
}

export interface JsonValidateEmpty {
  kind: 'empty';
}

export type JsonValidateResult =
  | JsonValidateOk
  | JsonValidateError
  | JsonValidateEmpty;

/**
 * Validate + parse a JSON string.
 *
 * Returns `empty` for a blank / whitespace-only input so the UI can render
 * a "waiting for input" status rather than the misleading
 * "Unexpected end of JSON input" error that raw `JSON.parse('')` emits.
 */
export function validateJson(text: string): JsonValidateResult {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }
  try {
    const value: unknown = JSON.parse(text);
    return { kind: 'ok', value };
  } catch (err) {
    return normalizeParseError(err, text);
  }
}

/** Maximum indent the UI exposes. Matches the common pretty-printer range; beyond
 *  8 spaces is disorienting and beyond 10 JSON.stringify clamps anyway. */
export const MAX_INDENT = 8;

/**
 * Format (pretty-print) a JSON string. Returns the reformatted text on
 * success or a parse error. `indent` is clamped into [0, MAX_INDENT];
 * 0 is equivalent to minify.
 */
export function formatJson(
  text: string,
  indent = 2,
):
  | { kind: 'ok'; text: string }
  | JsonValidateError
  | JsonValidateEmpty {
  const clampedIndent = Math.max(0, Math.min(MAX_INDENT, Math.floor(indent)));
  const parsed = validateJson(text);
  if (parsed.kind !== 'ok') return parsed;
  return {
    kind: 'ok',
    text: JSON.stringify(parsed.value, null, clampedIndent),
  };
}

/**
 * Strip all non-semantic whitespace from a JSON string. Idempotent on
 * already-minified input. Returns a parse error if the input isn't valid
 * JSON — we don't try to "best-effort" minify invalid input because that
 * would silently produce broken output.
 */
export function minifyJson(
  text: string,
):
  | { kind: 'ok'; text: string }
  | JsonValidateError
  | JsonValidateEmpty {
  const parsed = validateJson(text);
  if (parsed.kind !== 'ok') return parsed;
  return { kind: 'ok', text: JSON.stringify(parsed.value) };
}

// ----- internals ------------------------------------------------------

/**
 * Convert whatever `JSON.parse` threw into a stable error shape.
 *
 * Every modern JS runtime phrases the same JSON error differently, and the
 * phrasing has drifted between Node/V8 versions (Node 20 changed the format
 * again for "Unexpected token"). We try a cascade of probes, ordered from
 * most-authoritative to most-inferred, and take the first match:
 *
 *   1. `"...at position N"` — V8's legacy format and still used for many
 *      errors in Node 22. Authoritative.
 *   2. `"...at line X column Y"` or `"(line X column Y)"` — SpiderMonkey
 *      and newer V8 respectively. Authoritative.
 *   3. `"Unexpected token 'X'"` — newer V8 dropped the position from this
 *      variant and only reports the offending character + a source quote.
 *      We recover position by `text.indexOf(char)`. Imperfect if the char
 *      appears earlier in legal context (e.g. the bad `}` in `{"x":{}}`
 *      is not the first `}`) but the common case — the first appearance
 *      of the bad char IS the bad char — lands the pointer correctly.
 *   4. `"Unexpected end of JSON input"` — runtime-agnostic. No position in
 *      the message but the error is, by definition, at the end.
 *   5. Nothing matched: surface the raw message with null location so the
 *      UI still flags the error, just without a pointer.
 *
 * We deliberately do NOT try to reverse-engineer offset from the source
 * quotation V8 inlines into its message (`"{"a":}" is not valid JSON`) —
 * indexOf of the token is sufficient for the 99% case and doesn't have
 * an ambiguous-substring-match failure mode.
 */
function normalizeParseError(err: unknown, text: string): JsonValidateError {
  const message = err instanceof Error ? err.message : String(err);

  const posMatch = message.match(/position\s+(\d+)/i);
  if (posMatch) {
    const offset = Number(posMatch[1]);
    const { line, column } = lineColFromOffset(text, offset);
    return {
      kind: 'error',
      message: cleanMessage(message),
      line,
      column,
      offset,
    };
  }

  const lcMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lcMatch) {
    const line = Number(lcMatch[1]);
    const column = Number(lcMatch[2]);
    const offset = offsetFromLineCol(text, line, column);
    return {
      kind: 'error',
      message: cleanMessage(message),
      line,
      column,
      offset,
    };
  }

  // Newer V8 ("Node 20+") format: position stripped, only the offending
  // char remains. Recover by searching for it in the source.
  const tokenMatch = message.match(/Unexpected token\s+['"]?(\S)['"]?/i);
  if (tokenMatch) {
    const char = tokenMatch[1];
    const offset = text.indexOf(char);
    if (offset >= 0) {
      const { line, column } = lineColFromOffset(text, offset);
      return {
        kind: 'error',
        message: cleanMessage(message),
        line,
        column,
        offset,
      };
    }
  }

  // "Unexpected end of JSON input" → by definition the parser ran off the
  // end of `text`, so position there.
  if (/unexpected end of (json input|input)/i.test(message)) {
    const offset = text.length;
    const { line, column } = lineColFromOffset(text, offset);
    return {
      kind: 'error',
      message: cleanMessage(message),
      line,
      column,
      offset,
    };
  }

  return {
    kind: 'error',
    message: cleanMessage(message),
    line: null,
    column: null,
    offset: null,
  };
}

/**
 * Tidy up common runtime prefixes + verbose suffixes so the UI surface
 * reads the same regardless of which engine produced the error. Notable
 * cleanups:
 *   - SpiderMonkey's `"JSON.parse: "` prefix (no new info).
 *   - Newer V8's trailing `, "..source quote.." is not valid JSON` suffix
 *     (redundant with our line/column pointer and looks cluttered).
 *   - Older V8's `"Unexpected token X in JSON"` → `"Unexpected token X"`.
 */
function cleanMessage(message: string): string {
  return message
    .replace(/^JSON\.parse:\s*/i, '')
    .replace(/^Unexpected token\s+(.+?)\s+in JSON/i, 'Unexpected token $1')
    // V8's trailing source quote has several shapes:
    //   `, "{"a":}" is not valid JSON`            — nested inner quotes
    //   `, ..."1,\n  "b": oops\n}" is not valid JSON`  — literal `...` ellipsis
    //                                                    prefix, real newlines
    // Rather than model the internals (which keep drifting across Node
    // versions), strip from the first `, ` to the terminal `is not valid
    // JSON`. The preceding `Unexpected token 'X'` content already carries
    // the signal; the source quote was always redundant with the pointer
    // we're about to render.
    .replace(/,\s*[\s\S]*is not valid JSON\s*$/i, '')
    .trim();
}

/**
 * Compute 1-based `{ line, column }` from a 0-based byte offset. The
 * offset may point past the end of input (JSON.parse reports the first
 * byte past an unclosed string, for instance); we clamp into range so
 * the UI always gets a valid pointer.
 */
export function lineColFromOffset(
  text: string,
  offset: number,
): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(text.length, offset));
  let line = 1;
  let column = 1;
  for (let i = 0; i < clamped; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

/**
 * Inverse of `lineColFromOffset`. Returns `null` if the requested line
 * doesn't exist in the input — defensive, but this only fires when the
 * runtime gave us a truly out-of-range line number, which isn't expected.
 */
export function offsetFromLineCol(
  text: string,
  line: number,
  column: number,
): number | null {
  if (line < 1 || column < 1) return null;
  let currentLine = 1;
  let offset = 0;
  while (offset < text.length && currentLine < line) {
    if (text.charCodeAt(offset) === 10) currentLine += 1;
    offset += 1;
  }
  if (currentLine !== line) return null;
  const target = offset + (column - 1);
  return Math.min(target, text.length);
}

/** UTF-8 byte length of a string — used by the status bar size readout.
 *  JSON is text, but "bytes" is the metric most developers eyeball against
 *  (API response size budgets, Lambda payload limits). `TextEncoder` is
 *  the canonical way to measure that; it's present in every runtime Tauri
 *  supports. Exposed for the tool + tests. */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
