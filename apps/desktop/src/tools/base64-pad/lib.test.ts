import { describe, expect, it } from 'vitest';

import { decodeBase64, encodeBase64 } from './lib';
import type { Base64Options } from './lib';

/**
 * Base64 Pad lib — pure-function tests.
 *
 * Focus areas:
 *   - Round-trip: encode("hello") → decode → "hello" across ASCII, Unicode, emoji.
 *   - Empty/whitespace input returns `empty` instead of error.
 *   - URL-safe variant encodes without +/ and round-trips correctly.
 *   - Padding variants: strip removes =, both work on decode regardless.
 *   - Error cases: invalid characters, wrong length, non-decodable bytes.
 */

const STANDARD_OPTS: Base64Options = { variant: 'standard', padding: 'pad' };
const STANDARD_STRIP: Base64Options = { variant: 'standard', padding: 'strip' };
const URL_SAFE: Base64Options = { variant: 'url-safe', padding: 'pad' };
const URL_SAFE_STRIP: Base64Options = { variant: 'url-safe', padding: 'strip' };

describe('encodeBase64', () => {
  it('encodes simple ASCII text', () => {
    const r = encodeBase64('hello', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('aGVsbG8=');
      expect(r.bytes).toBe(5);
    }
  });

  it('encodes an empty string as empty', () => {
    expect(encodeBase64('', STANDARD_OPTS).kind).toBe('empty');
  });

  it('encodes whitespace-only input as empty', () => {
    expect(encodeBase64('   \n\t', STANDARD_OPTS).kind).toBe('empty');
  });

  it('encodes multi-byte UTF-8 (emoji)', () => {
    const r = encodeBase64('🚀', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      // 🚀 is U+1F680, UTF-8 = F0 9F 9A 80 (4 bytes), base64 = 8J+agA==.
      // (The earlier expected `8J+ase=` was the base64 of a different
      // 4-byte sequence — F0 9F AA B3 — and didn't actually decode to 🚀.)
      expect(r.bytes).toBe(4);
      expect(r.text).toBe('8J+agA==');
    }
  });

  it('encodes CJK characters', () => {
    const r = encodeBase64('日本', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      // Each CJK char is 3 bytes in UTF-8
      expect(r.bytes).toBe(6);
    }
  });

  it('produces standard base64 with + and / by default', () => {
    const r = encodeBase64('??>>', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      // Should contain + or / (base64 for these chars uses them)
      expect(r.text).toMatch(/[\+/]/);
    }
  });

  it('produces URL-safe base64 with - and _ instead of + and /', () => {
    const r = encodeBase64('??>>', URL_SAFE);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).not.toMatch(/[\+/]/);
    }
  });

  it('strips padding when requested', () => {
    const r = encodeBase64('hello', STANDARD_STRIP);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('aGVsbG8'); // No trailing =
      expect(r.text).not.toMatch(/=/);
    }
  });

  it('keeps padding by default', () => {
    const r = encodeBase64('a', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toMatch(/=+$/); // Should end with =
    }
  });
});

describe('decodeBase64', () => {
  it('decodes simple base64', () => {
    const r = decodeBase64('aGVsbG8=', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('hello');
      expect(r.bytes).toBe(5);
    }
  });

  it('decodes unpadded base64', () => {
    const r = decodeBase64('aGVsbG8', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('hello');
    }
  });

  it('returns empty for blank / whitespace input', () => {
    expect(decodeBase64('', STANDARD_OPTS).kind).toBe('empty');
    expect(decodeBase64('   \n\t', STANDARD_OPTS).kind).toBe('empty');
  });

  it('decodes URL-safe base64 regardless of options.variant', () => {
    // Encoded emoji in URL-safe form — decoder should detect and decode.
    const r = decodeBase64('8J+qs-_=', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
  });

  it('detects and decodes URL-safe variant automatically', () => {
    // Encode with URL-safe, then decode with standard options
    const encoded = encodeBase64('hello', URL_SAFE);
    expect(encoded.kind).toBe('ok');
    if (encoded.kind === 'ok') {
      const decoded = decodeBase64(encoded.text, STANDARD_OPTS);
      expect(decoded.kind).toBe('ok');
      if (decoded.kind === 'ok') {
        expect(decoded.text).toBe('hello');
      }
    }
  });

  it('rejects invalid base64 characters', () => {
    const r = decodeBase64('@@@', STANDARD_OPTS);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.message).toMatch(/invalid.*character/i);
    }
  });

  it('rejects base64 with wrong padding length', () => {
    // 'a' should pad to 'YQ==' but give it wrong padding
    const r = decodeBase64('YQ===', STANDARD_OPTS);
    expect(r.kind).toBe('error');
  });

  it('accepts unpadded input and pads internally', () => {
    // 'YQ' is 'a' without padding
    const r = decodeBase64('YQ', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('a');
    }
  });

  it('decodes multi-byte UTF-8 (emoji)', () => {
    // Base64 of UTF-8 F0 9F 9A 80 = 🚀 (U+1F680). The earlier test
    // input `8J+qs-=` was the base64 of a different 4-byte sequence
    // and didn't actually decode to 🚀.
    const r = decodeBase64('8J+agA==', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('🚀');
    }
  });

  it('survives invalid UTF-8 sequences via replacement chars', () => {
    // The decoder is intentionally lenient: invalid UTF-8 bytes (e.g.
    // `0xFF 0xFF` from `//==`) decode to U+FFFD replacement chars
    // rather than throwing. That's the friendlier UX for a generic
    // base64 decoder — the user sees a visible "I didn't recognize
    // these bytes" mark instead of an opaque error pill, and they can
    // tell from byte-count whether the payload was supposed to be text
    // at all.
    const invalidUtf8 = '//' + '='.repeat(2); // Decodes to 0xFF 0xFF
    const r = decodeBase64(invalidUtf8, STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      // Should contain at least one replacement char (U+FFFD = '�')
      expect(r.text).toContain('�');
    }
  });
});

describe('Round-trip (encode → decode)', () => {
  const testStrings = [
    'hello',
    'a',
    '',
    'The quick brown fox',
    '123 !@#$%^&*()',
    '🚀🌙⭐',
    '日本語',
    '你好世界',
    'Combining: e\u0301', // e with acute accent
    '\n\t  whitespace\n',
  ];

  testStrings.forEach((str) => {
    it(`round-trips: ${str.substring(0, 20)}...`, () => {
      // Standard + pad (default)
      const enc1 = encodeBase64(str, STANDARD_OPTS);
      if (enc1.kind === 'ok') {
        const dec1 = decodeBase64(enc1.text, STANDARD_OPTS);
        expect(dec1.kind).toBe('ok');
        if (dec1.kind === 'ok') {
          expect(dec1.text).toBe(str);
        }
      }

      // URL-safe + strip
      if (str.trim().length > 0) {
        const enc2 = encodeBase64(str, URL_SAFE_STRIP);
        if (enc2.kind === 'ok') {
          const dec2 = decodeBase64(enc2.text, URL_SAFE_STRIP);
          expect(dec2.kind).toBe('ok');
          if (dec2.kind === 'ok') {
            expect(dec2.text).toBe(str);
          }
        }
      }
    });
  });
});

describe('Variant detection', () => {
  it('decodes standard base64 with + and /', () => {
    const std = 'P+/='; // Some base64 with + and /
    const r = decodeBase64(std, STANDARD_OPTS);
    // Should not error on +/
    expect(r.kind).not.toBe('error');
  });

  it('converts URL-safe - and _ to standard + and / before decoding', () => {
    // '??>>' encodes to bytes that contain a `+` in standard base64
    // (`Pz8+Pg==`); URL-safe substitutes `-` for that `+`. The decoder
    // auto-detects the URL-safe alphabet and round-trips back to the
    // same source string. (The earlier expected `'??>'` was a typo —
    // the source had four chars, the round-trip should also have four.)
    const encoded = encodeBase64('??>>', URL_SAFE);
    if (encoded.kind === 'ok') {
      // Should have - or _ instead of + or /
      expect(encoded.text).not.toMatch(/[\+/]/);
      // Decode it anyway (should auto-detect)
      const decoded = decodeBase64(encoded.text, STANDARD_OPTS);
      expect(decoded.kind).toBe('ok');
      if (decoded.kind === 'ok') {
        expect(decoded.text).toBe('??>>');
      }
    }
  });
});

describe('Padding edge cases', () => {
  it('no padding needed: 3-byte length (length % 4 === 0)', () => {
    // 'abc' = 3 bytes, base64 is 4 chars, no padding
    const r = encodeBase64('abc', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('YWJj');
    }
  });

  it('one padding char: 1-byte length (length % 4 === 2)', () => {
    const r = encodeBase64('a', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('YQ==');
    }
  });

  it('two padding chars: 2-byte length (length % 4 === 3)', () => {
    const r = encodeBase64('ab', STANDARD_OPTS);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.text).toBe('YWI=');
    }
  });
});
