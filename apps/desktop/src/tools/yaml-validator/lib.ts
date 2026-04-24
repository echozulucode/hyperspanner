/**
 * Pure YAML operations for the YAML Validator tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable and can be reused by a potential future
 * backend-accelerated path. The tool component is the only thing that
 * wires these functions up to UI state.
 *
 * All entry points return a *discriminated union* rather than throwing.
 * We normalize js-yaml's `YAMLException` so the UI gets a stable
 * `{ line, column, message }` shape on any input.
 */

import yaml from 'js-yaml';

export interface YamlValidateOk {
  kind: 'ok';
  /** Parsed value. Typed as `unknown` because YAML input is untrusted. */
  value: unknown;
}

export interface YamlValidateError {
  kind: 'error';
  /** Normalized, human-readable error message. */
  message: string;
  /** 1-based line number of the error, or `null` if unavailable. */
  line: number | null;
  /** 1-based column within that line, or `null` if unavailable. */
  column: number | null;
}

export interface YamlValidateEmpty {
  kind: 'empty';
}

export type YamlValidateResult =
  | YamlValidateOk
  | YamlValidateError
  | YamlValidateEmpty;

/**
 * Validate + parse a YAML string.
 *
 * Returns `empty` for a blank / whitespace-only input so the UI can render
 * a "waiting for input" status rather than a confusing parse error.
 */
export function validateYaml(text: string): YamlValidateResult {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }
  try {
    const value: unknown = yaml.load(text);
    return { kind: 'ok', value };
  } catch (err) {
    return normalizeParseError(err);
  }
}

/**
 * Format (pretty-print) a YAML string. Returns the reformatted text on
 * success or a parse error. Uses sensible defaults: indent 2 spaces,
 * no line wrapping, no anchor references.
 */
export function formatYaml(
  text: string,
): { kind: 'ok'; text: string } | YamlValidateError | YamlValidateEmpty {
  const parsed = validateYaml(text);
  if (parsed.kind !== 'ok') return parsed;
  try {
    const dumped = yaml.dump(parsed.value, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });
    return { kind: 'ok', text: dumped };
  } catch (err) {
    return normalizeParseError(err);
  }
}

/**
 * Convert parsed YAML to pretty-printed JSON. Returns the JSON string on
 * success or a parse error. The source-of-truth buffer is YAML; this
 * function produces a read-only JSON view.
 */
export function toJson(
  text: string,
  indent = 2,
): { kind: 'ok'; text: string } | YamlValidateError | YamlValidateEmpty {
  const parsed = validateYaml(text);
  if (parsed.kind !== 'ok') return parsed;
  try {
    const json = JSON.stringify(parsed.value, null, indent);
    return { kind: 'ok', text: json };
  } catch (err) {
    // JSON.stringify should not throw on yaml-parsed values, but be defensive.
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : String(err),
      line: null,
      column: null,
    };
  }
}

// ----- internals -------------------------------------------------------

/**
 * Convert js-yaml's `YAMLException` into a stable error shape.
 *
 * js-yaml 4.x throws `YAMLException` which has `.mark` with `.line` and
 * `.column` (0-based). We extract those and convert to 1-based for display.
 */
function normalizeParseError(err: unknown): YamlValidateError {
  if (
    err &&
    typeof err === 'object' &&
    'mark' in err &&
    err.mark &&
    typeof err.mark === 'object'
  ) {
    const mark = err.mark as Record<string, unknown>;
    const line =
      typeof mark.line === 'number' ? mark.line + 1 : null;
    const column =
      typeof mark.column === 'number' ? mark.column + 1 : null;

    // js-yaml's .reason is the clean message; .message is more verbose.
    const message =
      err instanceof Error && 'reason' in err
        ? (err.reason as string) || err.message
        : err instanceof Error
          ? err.message
          : String(err);

    return {
      kind: 'error',
      message,
      line,
      column,
    };
  }

  // Fallback for unexpected error shapes.
  const message =
    err instanceof Error ? err.message : String(err);
  return {
    kind: 'error',
    message,
    line: null,
    column: null,
  };
}

/**
 * UTF-8 byte length of a string — used by the status bar size readout.
 * YAML is text, but "bytes" is the metric most developers eyeball against
 * (config file sizes, etc.). `TextEncoder` is the canonical way to measure that.
 */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
