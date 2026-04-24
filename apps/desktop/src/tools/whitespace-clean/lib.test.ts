import { describe, expect, it } from 'vitest';

import {
  cleanWhitespace,
  DEFAULT_OPTIONS,
  type WhitespaceOptions,
} from './lib';

/**
 * Whitespace Clean lib — pure-function tests.
 *
 * Focus areas:
 *   - Each rule individually (all others OFF) to verify correctness.
 *   - Combinations (all ON, all OFF) to verify interaction.
 *   - Edge cases (empty, BOM, Windows CRLF, mixed Unicode whitespace).
 *   - Stats (charsBefore/After, linesBefore/After).
 */

describe('cleanWhitespace', () => {
  describe('single rules in isolation', () => {
    it('trimEnds removes leading/trailing whitespace', () => {
      const opts: WhitespaceOptions = {
        trimEnds: true,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('   hello world   ', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello world');
    });

    it('trimEnds handles newlines correctly', () => {
      const opts: WhitespaceOptions = {
        trimEnds: true,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('  \n  hello  \n  ', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('\n  hello');
    });

    it('trimLines removes trailing spaces per line', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: true,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('hello   \nworld  ', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello\nworld');
    });

    it('collapseRuns collapses runs of spaces', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: true,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('hello    world     foo', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello world foo');
    });

    it('collapseRuns preserves single spaces', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: true,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('hello world', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello world');
    });

    it('collapseRuns collapses runs of tabs', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: true,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('hello\t\t\tworld', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello world');
    });

    it('collapseBlankLines collapses multiple blank lines', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: true,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('line1\n\n\n\nline2', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('line1\n\nline2');
    });

    it('collapseBlankLines preserves single blank lines', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: true,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('line1\n\nline2', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('line1\n\nline2');
    });

    it('tabsToSpaces replaces tabs with 2 spaces', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: true,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('hello\t\tworld', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello  world');
    });

    it('normalizeEOL converts CRLF to LF', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: true,
        stripBom: false,
      };
      const r = cleanWhitespace('hello\r\nworld', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello\nworld');
    });

    it('normalizeEOL converts old Mac CR to LF', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: true,
        stripBom: false,
      };
      const r = cleanWhitespace('hello\rworld', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello\nworld');
    });

    it('stripBom removes UTF-8 BOM', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: true,
      };
      const textWithBom = '\ufeffhello';
      const r = cleanWhitespace(textWithBom, opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello');
    });

    it('stripBom is a no-op if BOM is absent', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: true,
      };
      const r = cleanWhitespace('hello', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello');
    });
  });

  describe('combinations', () => {
    it('all options ON produces a fully cleaned output', () => {
      const opts = DEFAULT_OPTIONS;
      const input = '  \ufeff\nhello   \r\n\r\n   world\t\t  \n\n\n  ';
      const r = cleanWhitespace(input, opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        // BOM stripped, CRLF normalized, lines trimmed, blank lines collapsed,
        // tabs→spaces, runs collapsed, ends trimmed.
        // Expected: "hello\n\nworld"
        expect(r.text).toBe('hello\n\nworld');
      }
    });

    it('all options OFF returns the text unchanged (except empty check)', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: false,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const input = '  hello   world  ';
      const r = cleanWhitespace(input, opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe(input);
    });
  });

  describe('empty input', () => {
    it('returns empty for an empty string', () => {
      const r = cleanWhitespace('', DEFAULT_OPTIONS);
      expect(r.kind).toBe('empty');
    });

    it('returns empty for whitespace-only input', () => {
      const r = cleanWhitespace('   \n\t  ', DEFAULT_OPTIONS);
      expect(r.kind).toBe('empty');
    });
  });

  describe('stats', () => {
    it('computes charsBefore and charsAfter', () => {
      const r = cleanWhitespace('  hello  ', DEFAULT_OPTIONS);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        expect(r.stats.charsBefore).toBe(9);
        expect(r.stats.charsAfter).toBe(5);
      }
    });

    it('computes linesBefore and linesAfter', () => {
      const r = cleanWhitespace('hello\n\n\nworld', DEFAULT_OPTIONS);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        expect(r.stats.linesBefore).toBe(4);
        expect(r.stats.linesAfter).toBe(3); // collapsed to 2 blank lines + trimmed ends
      }
    });

    it('lines count is 1 for single-line text', () => {
      const r = cleanWhitespace('hello', DEFAULT_OPTIONS);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        expect(r.stats.linesBefore).toBe(1);
        expect(r.stats.linesAfter).toBe(1);
      }
    });
  });

  describe('edge cases', () => {
    it('handles Unicode NBSP (does not collapse)', () => {
      // U+00A0 is a non-breaking space — not a normal space or tab.
      // We do NOT collapse it by default since it's meaningful content.
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: true,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const input = 'hello\u00a0\u00a0world';
      const r = cleanWhitespace(input, opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        // NBSP is preserved; only spaces and tabs are collapsed.
        expect(r.text).toBe(input);
      }
    });

    it('handles mixed spaces and tabs in a run', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: false,
        collapseRuns: true,
        collapseBlankLines: false,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('hello  \t  world', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello world');
    });

    it('handles lines with only whitespace in collapseBlankLines', () => {
      const opts: WhitespaceOptions = {
        trimEnds: false,
        trimLines: true,
        collapseRuns: false,
        collapseBlankLines: true,
        tabsToSpaces: false,
        normalizeEOL: false,
        stripBom: false,
      };
      const r = cleanWhitespace('line1\n  \t  \n\n   \nline2', opts);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        // Blank lines with trailing whitespace should be trimmed then collapsed.
        expect(r.text.includes('\n\n')).toBe(true);
      }
    });
  });
});
