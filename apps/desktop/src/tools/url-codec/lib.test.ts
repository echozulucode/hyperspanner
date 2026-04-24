import { describe, expect, it } from 'vitest';

import { decodeUrl, encodeUrl } from './lib';
import type { UrlOptions } from './lib';

/**
 * URL Codec lib — pure-function tests.
 *
 * Focus areas:
 *   - Component mode: escapes every reserved character (/, ?, #, &, =, +, :, @).
 *   - URI mode: preserves URI separators where applicable.
 *   - Plus-as-space: space ↔ `+` translation on both encode and decode.
 *   - Round-trip invariants: decode(encode(x)) === x for diverse inputs.
 *   - Decode errors: invalid %XX sequences, truncated %XX, dangling %, with
 *     correct offset detection.
 *   - UTF-8 multi-byte and emoji handling.
 *   - Empty input collapses to `kind: 'empty'`.
 */

const componentStandard: UrlOptions = {
  mode: 'component',
  plusMode: 'standard',
};

const componentPlusAsSpace: UrlOptions = {
  mode: 'component',
  plusMode: 'plus-as-space',
};

const uriStandard: UrlOptions = {
  mode: 'uri',
  plusMode: 'standard',
};

const uriPlusAsSpace: UrlOptions = {
  mode: 'uri',
  plusMode: 'plus-as-space',
};

describe('encodeUrl', () => {
  describe('component mode', () => {
    it('encodes space as %20 in standard mode', () => {
      const r = encodeUrl('hello world', componentStandard);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello%20world');
    });

    it('encodes reserved characters: /, ?, #, &, =, +, :, @', () => {
      const r = encodeUrl('/?#&=+:@', componentStandard);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        expect(r.text).toMatch(/%2F/); // /
        expect(r.text).toMatch(/%3F/); // ?
        expect(r.text).toMatch(/%23/); // #
        expect(r.text).toMatch(/%26/); // &
        expect(r.text).toMatch(/%3D/); // =
        expect(r.text).toMatch(/%2B/); // +
        expect(r.text).toMatch(/%3A/); // :
        expect(r.text).toMatch(/%40/); // @
      }
    });

    it('encodes non-ASCII characters as multi-byte UTF-8 %XX sequences', () => {
      const r = encodeUrl('café', componentStandard);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        // 'é' encodes to %C3%A9 (UTF-8: 0xC3 0xA9)
        expect(r.text).toContain('%C3%A9');
      }
    });

    it('encodes emoji as multi-byte UTF-8', () => {
      const r = encodeUrl('🚀', componentStandard);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        // '🚀' is U+1F680, UTF-8: 0xF0 0x9F 0x9A 0x80
        expect(r.text).toBe('%F0%9F%9A%80');
      }
    });

    it('handles plus-as-space: encodes space as +', () => {
      const r = encodeUrl('hello world', componentPlusAsSpace);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello+world');
    });

    it('returns empty for whitespace-only input', () => {
      expect(encodeUrl('', componentStandard).kind).toBe('empty');
      expect(encodeUrl('  \n\t', componentStandard).kind).toBe('empty');
    });
  });

  describe('uri mode', () => {
    it('preserves unreserved characters that encodeURI allows', () => {
      // encodeURI preserves: ; , / ? : @ & = + $ #
      // We test that slashes, question marks, etc. are NOT encoded.
      const r = encodeUrl('/path?query=value&other=123', uriStandard);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        expect(r.text).toContain('/');
        expect(r.text).toContain('?');
        expect(r.text).toContain('&');
        expect(r.text).toContain('=');
      }
    });

    it('still encodes spaces as %20 in uri standard mode', () => {
      const r = encodeUrl('hello world', uriStandard);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello%20world');
    });

    it('encodes space as + in uri plus-as-space mode', () => {
      const r = encodeUrl('hello world', uriPlusAsSpace);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello+world');
    });

    it('encodes non-ASCII in uri mode', () => {
      const r = encodeUrl('café', uriStandard);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        expect(r.text).toContain('%C3%A9');
      }
    });
  });
});

describe('decodeUrl', () => {
  it('decodes %20 as space in standard mode', () => {
    const r = decodeUrl('hello%20world', componentStandard);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.text).toBe('hello world');
  });

  it('decodes reserved characters back from %XX', () => {
    const r = decodeUrl('%2F%3F%23', componentStandard);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.text).toBe('/?#');
  });

  it('decodes UTF-8 multi-byte sequences correctly', () => {
    const r = decodeUrl('%C3%A9', componentStandard);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.text).toBe('é');
  });

  it('decodes emoji from UTF-8', () => {
    const r = decodeUrl('%F0%9F%9A%80', componentStandard);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.text).toBe('🚀');
  });

  it('handles plus-as-space: decodes + as space', () => {
    const r = decodeUrl('hello+world', componentPlusAsSpace);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.text).toBe('hello world');
  });

  it('standard mode leaves + as +', () => {
    const r = decodeUrl('hello+world', componentStandard);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.text).toBe('hello+world');
  });

  it('returns empty for whitespace-only input', () => {
    expect(decodeUrl('', componentStandard).kind).toBe('empty');
    expect(decodeUrl('  \n\t', componentStandard).kind).toBe('empty');
  });

  describe('error cases', () => {
    it('returns error for invalid hex in %ZZ', () => {
      const r = decodeUrl('%ZZ', componentStandard);
      expect(r.kind).toBe('error');
      if (r.kind === 'error') {
        expect(r.message).toMatch(/invalid|percent/i);
        expect(r.offset).toBe(0);
      }
    });

    it('returns error for truncated %2', () => {
      const r = decodeUrl('%2', componentStandard);
      expect(r.kind).toBe('error');
      if (r.kind === 'error') {
        expect(r.offset).toBe(0);
      }
    });

    it('returns error for dangling %', () => {
      const r = decodeUrl('abc%', componentStandard);
      expect(r.kind).toBe('error');
      if (r.kind === 'error') {
        expect(r.offset).toBe(3);
      }
    });

    it('detects the offset of the first malformed %XX in mixed content', () => {
      const r = decodeUrl('hello%20world%ZZmore', componentStandard);
      expect(r.kind).toBe('error');
      if (r.kind === 'error') {
        // %ZZ starts at offset 12 (after "hello%20world")
        expect(r.offset).toBe(12);
      }
    });
  });
});

describe('round-trip invariants', () => {
  const roundTripTests: Array<[string, UrlOptions]> = [
    ['hello', componentStandard],
    ['hello world', componentStandard],
    ['café', componentStandard],
    ['🚀 rocket', componentStandard],
    ['/path?query=1&other=2', uriStandard],
    ['hello world', componentPlusAsSpace],
    ['a-b_c.d', componentStandard],
    ['user@example.com', componentStandard],
    ['key=value&foo=bar', uriStandard],
  ];

  roundTripTests.forEach(([text, options]) => {
    it(`decode(encode(${JSON.stringify(text)})) === original with ${options.mode}/${options.plusMode}`, () => {
      const encoded = encodeUrl(text, options);
      expect(encoded.kind).toBe('ok');
      if (encoded.kind === 'ok') {
        const decoded = decodeUrl(encoded.text, options);
        expect(decoded.kind).toBe('ok');
        if (decoded.kind === 'ok') {
          expect(decoded.text).toBe(text);
        }
      }
    });
  });
});

describe('combining characters', () => {
  it('round-trips combining diacritics (e + combining acute)', () => {
    const text = 'e\u0301'; // e + combining acute → é (decomposed form)
    const encoded = encodeUrl(text, componentStandard);
    expect(encoded.kind).toBe('ok');
    if (encoded.kind === 'ok') {
      const decoded = decodeUrl(encoded.text, componentStandard);
      expect(decoded.kind).toBe('ok');
      if (decoded.kind === 'ok') {
        expect(decoded.text).toBe(text);
      }
    }
  });
});
