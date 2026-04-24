import { describe, expect, it } from 'vitest';

import {
  byteLength,
  formatJson,
  lineColFromOffset,
  minifyJson,
  offsetFromLineCol,
  validateJson,
} from './lib';

/**
 * JSON Validator lib — pure-function tests.
 *
 * Focus areas:
 *   - Happy paths across input shapes (primitive, object, nested array).
 *   - Empty/whitespace input collapses to `kind: 'empty'` instead of a
 *     confusing parse-error render.
 *   - Error normalization: line/column/offset are computed regardless of
 *     which message format the current runtime produces. We can't exercise
 *     both V8 and SpiderMonkey from Vitest, but we can verify the
 *     offset-path math and the line-col-path math against representative
 *     inputs, and ensure the "no position info" path degrades gracefully.
 *   - Format/minify round-trip invariants.
 */

describe('validateJson', () => {
  it('parses an object', () => {
    const r = validateJson('{"a":1,"b":"two"}');
    expect(r).toEqual({ kind: 'ok', value: { a: 1, b: 'two' } });
  });

  it('parses a top-level array with nested objects', () => {
    const r = validateJson('[{"x":1},{"x":2}]');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toEqual([{ x: 1 }, { x: 2 }]);
    }
  });

  it('parses bare primitives', () => {
    expect(validateJson('true').kind).toBe('ok');
    expect(validateJson('null').kind).toBe('ok');
    expect(validateJson('42').kind).toBe('ok');
    expect(validateJson('"a string"').kind).toBe('ok');
  });

  it('returns empty for whitespace-only input', () => {
    expect(validateJson('').kind).toBe('empty');
    expect(validateJson('   \n\t').kind).toBe('empty');
  });

  it('reports an error with position + line/column for a malformed object', () => {
    // Missing value after the colon. V8 points at the `}`.
    const r = validateJson('{"a":}');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.offset).not.toBeNull();
      expect(r.line).toBe(1);
      // Column should point at or near the offending `}` (index 5 -> col 6).
      expect(r.column).not.toBeNull();
    }
  });

  it('computes line/column across a newline', () => {
    const text = '{\n  "a": 1,\n  "b": oops\n}';
    const r = validateJson(text);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      // Whatever the runtime reports, line should be either the 3rd (oops)
      // or very close to it. We assert it's not line 1 — i.e. the newline
      // accounting actually ran.
      expect(r.line).not.toBe(1);
    }
  });

  it('cleans common runtime prefixes from the message', () => {
    const r = validateJson('{"a":}');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.message).not.toMatch(/^JSON\.parse:/i);
    }
  });
});

describe('formatJson', () => {
  it('pretty-prints with the requested indent', () => {
    const r = formatJson('{"a":1,"b":[1,2]}', 2);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
    }
  });

  it('clamps indent into the supported range (0..8)', () => {
    // Negative indent → 0 → minified-equivalent output.
    const neg = formatJson('{"a":1}', -5);
    expect(neg.kind).toBe('ok');
    if (neg.kind === 'ok') expect(neg.text).toBe('{"a":1}');
    // Oversized indent → capped at MAX_INDENT (8 spaces per level).
    const big = formatJson('{"a":1}', 99);
    expect(big.kind).toBe('ok');
    if (big.kind === 'ok') expect(big.text).toMatch(/^\{\n {8}"a": 1\n\}$/);
  });

  it('surfaces a parse error when input is invalid', () => {
    const r = formatJson('{"a":}', 2);
    expect(r.kind).toBe('error');
  });

  it('returns empty when the input is blank', () => {
    expect(formatJson('  ', 2).kind).toBe('empty');
  });
});

describe('minifyJson', () => {
  it('strips whitespace from an indented object', () => {
    const r = minifyJson('{\n  "a": 1,\n  "b": 2\n}');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.text).toBe('{"a":1,"b":2}');
  });

  it('is idempotent on already-minified input', () => {
    const first = minifyJson('{"a":1}');
    expect(first.kind).toBe('ok');
    if (first.kind === 'ok') {
      const again = minifyJson(first.text);
      expect(again.kind).toBe('ok');
      if (again.kind === 'ok') expect(again.text).toBe('{"a":1}');
    }
  });

  it('refuses invalid input rather than silently producing broken output', () => {
    expect(minifyJson('{bad}').kind).toBe('error');
  });
});

describe('lineColFromOffset / offsetFromLineCol', () => {
  it('counts 1-based line and column from an offset', () => {
    const text = 'ab\ncd\nef';
    expect(lineColFromOffset(text, 0)).toEqual({ line: 1, column: 1 });
    expect(lineColFromOffset(text, 1)).toEqual({ line: 1, column: 2 });
    expect(lineColFromOffset(text, 3)).toEqual({ line: 2, column: 1 });
    expect(lineColFromOffset(text, 7)).toEqual({ line: 3, column: 2 });
  });

  it('clamps an out-of-range offset to the input length', () => {
    const text = 'abc';
    expect(lineColFromOffset(text, 99)).toEqual({ line: 1, column: 4 });
  });

  it('round-trips offset ↔ line/column for simple input', () => {
    const text = 'one\ntwo\nthree';
    for (let o = 0; o <= text.length; o++) {
      const { line, column } = lineColFromOffset(text, o);
      expect(offsetFromLineCol(text, line, column)).toBe(o);
    }
  });

  it('rejects zero or negative line/column', () => {
    expect(offsetFromLineCol('ab', 0, 1)).toBeNull();
    expect(offsetFromLineCol('ab', 1, 0)).toBeNull();
  });
});

describe('byteLength', () => {
  it('counts ASCII as one byte each', () => {
    expect(byteLength('abc')).toBe(3);
  });

  it('counts multi-byte UTF-8 correctly', () => {
    // 'é' is 2 bytes, '🚀' is 4 bytes.
    expect(byteLength('é')).toBe(2);
    expect(byteLength('🚀')).toBe(4);
    expect(byteLength('a🚀b')).toBe(6);
  });
});
