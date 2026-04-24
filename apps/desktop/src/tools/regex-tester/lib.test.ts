import { describe, expect, it } from 'vitest';

import {
  compileRegex,
  runRegex,
  type RegexFlags,
} from './lib';

/**
 * Regex Tester lib — pure-function tests.
 *
 * Focus areas:
 *   - Basic global matching: `/foo/g` on "foo bar foo" → 2 matches.
 *   - Flag behavior: `i`, `m`, `s`, `u`, `y` flags applied correctly.
 *   - Capture groups: numeric and named, with correct indices.
 *   - Error handling: invalid patterns surface clean error messages.
 *   - matchLimit: `//g` doesn't hang; returns truncated=true past the limit.
 *   - Empty states: empty pattern → `kind: 'empty'`; valid pattern + empty
 *     sample → ok with zero matches.
 */

const FLAGS_DEFAULT: RegexFlags = { g: true, i: false, m: false, s: false, u: false, y: false };

describe('compileRegex', () => {
  it('compiles a simple pattern with global flag', () => {
    const result = compileRegex('foo', FLAGS_DEFAULT);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.regex.source).toBe('foo');
      expect(result.regex.global).toBe(true);
    }
  });

  it('returns empty for blank pattern', () => {
    expect(compileRegex('', FLAGS_DEFAULT).kind).toBe('empty');
    expect(compileRegex('   ', FLAGS_DEFAULT).kind).toBe('empty');
  });

  it('returns error for invalid pattern', () => {
    const result = compileRegex('(/', FLAGS_DEFAULT);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('applies case-insensitive flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, i: true };
    const result = compileRegex('foo', flags);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.regex.ignoreCase).toBe(true);
    }
  });

  it('applies multiline flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, m: true };
    const result = compileRegex('foo', flags);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.regex.multiline).toBe(true);
    }
  });

  it('applies dot-all flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, s: true };
    const result = compileRegex('foo', flags);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.regex.dotAll).toBe(true);
    }
  });

  it('applies unicode flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, u: true };
    const result = compileRegex('foo', flags);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.regex.unicode).toBe(true);
    }
  });

  it('applies sticky flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, y: true };
    const result = compileRegex('foo', flags);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.regex.sticky).toBe(true);
    }
  });
});

describe('runRegex', () => {
  it('returns empty for blank pattern', () => {
    expect(runRegex('', FLAGS_DEFAULT, 'sample').kind).toBe('empty');
  });

  it('finds multiple matches with global flag', () => {
    const result = runRegex('foo', FLAGS_DEFAULT, 'foo bar foo');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(2);
      expect(result.matches[0]).toEqual({
        index: 0,
        start: 0,
        end: 3,
        match: 'foo',
        groups: [],
      });
      expect(result.matches[1]).toEqual({
        index: 8,
        start: 8,
        end: 11,
        match: 'foo',
        groups: [],
      });
    }
  });

  it('returns ok with zero matches when sample is empty', () => {
    const result = runRegex('foo', FLAGS_DEFAULT, '');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(0);
      expect(result.truncated).toBe(false);
    }
  });

  it('respects case-insensitive flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, i: true };
    const result = runRegex('foo', flags, 'FOO foo');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(2);
    }
  });

  it('respects case-sensitive matching when i flag is off', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, i: false };
    const result = runRegex('foo', flags, 'FOO foo');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(1);
      expect(result.matches[0].match).toBe('foo');
    }
  });

  it('respects multiline flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, m: true };
    const result = runRegex('^foo', flags, 'bar\nfoo');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(1);
      expect(result.matches[0].match).toBe('foo');
    }
  });

  it('fails without multiline flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, m: false };
    const result = runRegex('^foo', flags, 'bar\nfoo');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(0);
    }
  });

  it('respects dot-all flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, s: true };
    const result = runRegex('a.b', flags, 'a\nb');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(1);
    }
  });

  it('fails without dot-all flag', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, s: false };
    const result = runRegex('a.b', flags, 'a\nb');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(0);
    }
  });

  it('captures numeric groups', () => {
    const result = runRegex('(\\w+)@(\\w+)', FLAGS_DEFAULT, 'user@domain user2@domain2');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(2);
      expect(result.matches[0].groups.length).toBe(2);
      expect(result.matches[0].groups[0].value).toBe('user');
      expect(result.matches[0].groups[1].value).toBe('domain');
    }
  });

  it('captures named groups', () => {
    const result = runRegex('(\\w+)@(?<domain>\\w+)', FLAGS_DEFAULT, 'user@domain');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches[0].groups.length).toBeGreaterThan(0);
      const named = result.matches[0].groups.find(g => g.name === 'domain');
      expect(named?.value).toBe('domain');
    }
  });

  it('returns error on invalid pattern', () => {
    const result = runRegex('(/', FLAGS_DEFAULT, 'sample');
    expect(result.kind).toBe('error');
  });

  it('prevents infinite loops with zero-length matches', () => {
    const result = runRegex('a*', FLAGS_DEFAULT, 'bbb', { matchLimit: 10 });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      // Should match multiple zero-length sequences without hanging
      expect(result.matches.length).toBeLessThanOrEqual(10);
    }
  });

  it('sets truncated=true when matchLimit is exceeded', () => {
    const result = runRegex('a', FLAGS_DEFAULT, 'aaaaaaaaaaaa', { matchLimit: 5 });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(5);
      expect(result.truncated).toBe(true);
    }
  });

  it('respects default matchLimit of 500', () => {
    const longText = 'x'.repeat(600);
    const result = runRegex('x', FLAGS_DEFAULT, longText);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(500);
      expect(result.truncated).toBe(true);
    }
  });

  it('sticky flag only matches at lastIndex', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, g: false, y: true };
    const result = runRegex('foo', flags, 'foo bar foo');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      // Sticky only matches at position 0 (the start).
      expect(result.matches.length).toBe(1);
      expect(result.matches[0].match).toBe('foo');
    }
  });

  it('without global flag, returns only the first match', () => {
    const flags: RegexFlags = { ...FLAGS_DEFAULT, g: false };
    const result = runRegex('foo', flags, 'foo bar foo');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.matches.length).toBe(1);
    }
  });

  it('handles empty match at start of string', () => {
    const result = runRegex('^', FLAGS_DEFAULT, 'abc');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      // ^ at global should match at position 0 only (no multiline)
      expect(result.matches.length).toBeGreaterThan(0);
    }
  });
});
