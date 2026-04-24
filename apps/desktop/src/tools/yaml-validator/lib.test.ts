import { describe, expect, it } from 'vitest';

import {
  byteLength,
  formatYaml,
  toJson,
  validateYaml,
} from './lib';

/**
 * YAML Validator lib — pure-function tests.
 *
 * Focus areas:
 *   - Happy paths across YAML shapes (scalars, mappings, sequences, nested).
 *   - YAML-specific features: anchors, references, multi-line strings
 *     (literal `|` and folded `>`), explicit types, booleans.
 *   - Empty/whitespace input collapses to `kind: 'empty'`.
 *   - Error normalization: line/column extracted from js-yaml's mark.
 *   - Round-trip invariants: format idempotent on canonical documents.
 *   - JSON conversion: parsed YAML → pretty JSON, always valid.
 */

describe('validateYaml', () => {
  it('parses a simple scalar', () => {
    const r = validateYaml('hello');
    expect(r).toEqual({ kind: 'ok', value: 'hello' });
  });

  it('parses a mapping', () => {
    const r = validateYaml('name: Alice\nage: 30');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toEqual({ name: 'Alice', age: 30 });
    }
  });

  it('parses a sequence', () => {
    const r = validateYaml('- one\n- two\n- three');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toEqual(['one', 'two', 'three']);
    }
  });

  it('parses nested structures', () => {
    const r = validateYaml(
      'servers:\n  - name: web\n    port: 80\n  - name: db\n    port: 5432'
    );
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toEqual({
        servers: [
          { name: 'web', port: 80 },
          { name: 'db', port: 5432 },
        ],
      });
    }
  });

  it('parses multi-line literal strings (|)', () => {
    const r = validateYaml('message: |\n  line one\n  line two');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toEqual({
        message: 'line one\nline two\n',
      });
    }
  });

  it('parses multi-line folded strings (>)', () => {
    const r = validateYaml('text: >\n  this is\n  folded');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(typeof r.value).toBe('object');
    }
  });

  it('parses explicit types', () => {
    const r = validateYaml('count: !!int "42"');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toEqual({ count: 42 });
    }
  });

  it('parses various boolean representations', () => {
    const r = validateYaml('a: true\nb: false\nc: yes\nd: no');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toEqual({
        a: true,
        b: false,
        c: true,
        d: false,
      });
    }
  });

  it('parses YAML with anchors and references', () => {
    const r = validateYaml('defaults: &defaults\n  timeout: 30\nserver:\n  <<: *defaults');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toEqual({
        defaults: { timeout: 30 },
        server: { timeout: 30 },
      });
    }
  });

  it('returns empty for whitespace-only input', () => {
    expect(validateYaml('').kind).toBe('empty');
    expect(validateYaml('   \n\t  ').kind).toBe('empty');
  });

  it('reports an error with line/column for malformed YAML', () => {
    const r = validateYaml('foo:\n  bar: [unclosed');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.line).not.toBeNull();
      expect(r.column).not.toBeNull();
      expect(r.message).not.toBe('');
    }
  });

  it('reports an error on mis-indented mapping', () => {
    const r = validateYaml('a: 1\n b: 2');
    expect(r.kind).toBe('error');
  });

  it('reports an error on unclosed sequence', () => {
    const r = validateYaml('a: 1\nb: [1, 2');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.line).not.toBeNull();
    }
  });
});

describe('formatYaml', () => {
  it('dumps valid YAML back with consistent formatting', () => {
    const r = formatYaml('a: 1\nb: 2');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toContain('a: 1');
      expect(r.text).toContain('b: 2');
    }
  });

  it('is idempotent on canonical output', () => {
    const first = formatYaml('a: 1\nb: 2');
    expect(first.kind).toBe('ok');
    if (first.kind === 'ok') {
      const second = formatYaml(first.text);
      expect(second.kind).toBe('ok');
      if (second.kind === 'ok') {
        expect(second.text).toBe(first.text);
      }
    }
  });

  it('surfaces a parse error when input is invalid', () => {
    const r = formatYaml('foo: [unclosed');
    expect(r.kind).toBe('error');
  });

  it('returns empty when the input is blank', () => {
    expect(formatYaml('  ').kind).toBe('empty');
  });

  it('respects indent: 2 in dump output', () => {
    const r = formatYaml('a:\n  b:\n    c: 1');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      // Check for 2-space indentation.
      expect(r.text).toMatch(/^a:\n  b:\n    c: 1/m);
    }
  });
});

describe('toJson', () => {
  it('converts valid YAML to pretty JSON', () => {
    const r = toJson('name: Alice\nage: 30', 2);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      // Should be parseable as JSON.
      const json = JSON.parse(r.text);
      expect(json).toEqual({ name: 'Alice', age: 30 });
      // Should be indented.
      expect(r.text).toContain('\n');
    }
  });

  it('preserves YAML structures in JSON conversion', () => {
    const r = toJson('items:\n  - x: 1\n  - x: 2', 2);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      const json = JSON.parse(r.text);
      expect(json.items).toEqual([{ x: 1 }, { x: 2 }]);
    }
  });

  it('surfaces a parse error on invalid YAML', () => {
    const r = toJson('[unclosed', 2);
    expect(r.kind).toBe('error');
  });

  it('returns empty for blank input', () => {
    expect(toJson('  ', 2).kind).toBe('empty');
  });

  it('respects the indent parameter', () => {
    const r2 = toJson('a: 1\nb: 2', 2);
    const r4 = toJson('a: 1\nb: 2', 4);
    expect(r2.kind).toBe('ok');
    expect(r4.kind).toBe('ok');
    if (r2.kind === 'ok' && r4.kind === 'ok') {
      // 4-space indent should have more spaces per level.
      expect(r4.text.length).toBeGreaterThan(r2.text.length);
    }
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
