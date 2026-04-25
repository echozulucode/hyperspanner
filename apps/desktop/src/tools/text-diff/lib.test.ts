// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { byteLength, diffTexts } from './lib';

describe('diffTexts', () => {
  it('empty on both sides → { kind: "empty" }', () => {
    const result = diffTexts('', '');
    expect(result.kind).toBe('empty');
  });

  it('whitespace-only on both sides → { kind: "empty" }', () => {
    const result = diffTexts('   \n\n  \t', '\t\n  ');
    expect(result.kind).toBe('empty');
  });

  it('identical non-empty → identical: true, all-unchanged hunks', () => {
    const result = diffTexts('hello\nworld', 'hello\nworld');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.identical).toBe(true);
      expect(result.stats.added).toBe(0);
      expect(result.stats.removed).toBe(0);
      expect(result.stats.modified).toBe(0);
      expect(result.stats.unchanged).toBe(2);
      expect(result.hunks.every((h) => h.kind === 'unchanged')).toBe(true);
    }
  });

  it('left only (right empty) → all-removed hunks', () => {
    const result = diffTexts('line1\nline2', '');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.removed).toBe(2);
      expect(result.stats.added).toBe(0);
      expect(result.hunks.every((h) => h.kind === 'removed')).toBe(true);
    }
  });

  it('right only (left empty) → all-added hunks', () => {
    const result = diffTexts('', 'line1\nline2');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.added).toBe(2);
      expect(result.stats.removed).toBe(0);
      expect(result.hunks.every((h) => h.kind === 'added')).toBe(true);
    }
  });

  it('single line changed in the middle → modified hunk with inline array', () => {
    const result = diffTexts('line1\nold text\nline3', 'line1\nnew text\nline3');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.modified).toBe(1);
      const modHunk = result.hunks.find((h) => h.kind === 'modified');
      expect(modHunk).not.toBeUndefined();
      expect(modHunk?.leftLine?.inline).not.toBeUndefined();
      expect(modHunk?.rightLine?.inline).not.toBeUndefined();
      // Check that inline[] has a mix of unchanged and changed entries
      const leftInline = modHunk?.leftLine?.inline || [];
      const rightInline = modHunk?.rightLine?.inline || [];
      expect(leftInline.length).toBeGreaterThan(0);
      expect(rightInline.length).toBeGreaterThan(0);
    }
  });

  it('multiple consecutive changes', () => {
    const left = 'line1\nold line 2\nold line 3\nline4';
    const right = 'line1\nnew line 2\nnew line 3\nline4';
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.modified).toBe(2);
    }
  });

  it('insertion in the middle', () => {
    const left = 'line1\nline3';
    const right = 'line1\nline2\nline3';
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.added).toBe(1);
      expect(result.stats.removed).toBe(0);
    }
  });

  it('deletion in the middle', () => {
    const left = 'line1\nline2\nline3';
    const right = 'line1\nline3';
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.removed).toBe(1);
      expect(result.stats.added).toBe(0);
    }
  });

  it('line count sanity on 100-line pair', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
    const left = lines.join('\n');
    const right = left; // identical for this test
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.unchanged).toBe(100);
    }
  });

  it('unicode in modified lines does not crash', () => {
    const left = 'emoji: 😀\ntext';
    const right = 'emoji: 🎉\ntext';
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.modified).toBe(1);
    }
  });

  it('combining chars in modified lines', () => {
    const left = 'café\ntext';
    const right = 'cafe\ntext';
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
  });

  it('trailing newline invariance: a\\nb\\n vs a\\nb', () => {
    const result1 = diffTexts('a\nb\n', 'a\nb');
    const result2 = diffTexts('a\nb', 'a\nb\n');
    // Both should treat them as identical (or minimally different)
    // because the semantic content is the same
    expect(result1.kind).toBe('ok');
    expect(result2.kind).toBe('ok');
  });

  it('long line with single character changed', () => {
    const longLine = 'a'.repeat(1000);
    const left = longLine;
    const right = longLine.slice(0, 500) + 'x' + longLine.slice(501);
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.modified).toBe(1);
      const modHunk = result.hunks.find((h) => h.kind === 'modified');
      // inline[] should highlight just the changed region
      expect(modHunk?.leftLine?.inline).not.toBeUndefined();
      expect(modHunk?.rightLine?.inline).not.toBeUndefined();
    }
  });

  it('swap invariant: diffing (A, B) and (B, A) has symmetrically swapped counts', () => {
    const a = 'line1\nold\nline3';
    const b = 'line1\nnew\nline3';
    const result1 = diffTexts(a, b);
    const result2 = diffTexts(b, a);
    expect(result1.kind).toBe('ok');
    expect(result2.kind).toBe('ok');
    if (result1.kind === 'ok' && result2.kind === 'ok') {
      expect(result1.stats.added).toBe(result2.stats.removed);
      expect(result1.stats.removed).toBe(result2.stats.added);
      expect(result1.stats.modified).toBe(result2.stats.modified);
    }
  });

  it('removed then added on different lines', () => {
    const left = 'line1\nremovedline\nline3';
    const right = 'line1\nline3\naddedline';
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.removed).toBeGreaterThan(0);
      expect(result.stats.added).toBeGreaterThan(0);
    }
  });

  it('complex edit: remove block, modify line, add block', () => {
    const left = 'keep\nremove me\nalso\nchange this\nkeep';
    const right = 'keep\nchange that\nadd this\nadd that\nkeep';
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.hunks.length).toBeGreaterThan(0);
      expect(result.stats.removed).toBeGreaterThan(0);
      expect(result.stats.added).toBeGreaterThan(0);
    }
  });

  it('single line text, no newline', () => {
    const result = diffTexts('hello', 'world');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.stats.modified).toBe(1);
    }
  });

  it('identical text returns identical flag true', () => {
    const result = diffTexts('same', 'same');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.identical).toBe(true);
    }
  });

  it('different text returns identical flag false', () => {
    const result = diffTexts('different', 'texts');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.identical).toBe(false);
    }
  });

  it('line numbers increment correctly on each side', () => {
    const left = 'a\nb\nc';
    const right = 'a\nb\nc';
    const result = diffTexts(left, right);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.hunks[0].leftLine?.number).toBe(1);
      expect(result.hunks[0].rightLine?.number).toBe(1);
      expect(result.hunks[1].leftLine?.number).toBe(2);
      expect(result.hunks[1].rightLine?.number).toBe(2);
      expect(result.hunks[2].leftLine?.number).toBe(3);
      expect(result.hunks[2].rightLine?.number).toBe(3);
    }
  });
});

describe('byteLength', () => {
  it('ASCII string', () => {
    expect(byteLength('hello')).toBe(5);
  });

  it('2-byte UTF-8 char (é)', () => {
    expect(byteLength('café')).toBe(5); // c a f é(2 bytes)
  });

  it('4-byte UTF-8 emoji (😀)', () => {
    expect(byteLength('😀')).toBe(4);
  });

  it('empty string', () => {
    expect(byteLength('')).toBe(0);
  });

  it('mixed ASCII and emoji', () => {
    const text = 'hello 👋';
    // h e l l o space emoji(4) = 5 + 1 + 4 = 10
    expect(byteLength(text)).toBe(10);
  });
});
