import { describe, expect, it } from 'vitest';

import {
  BYTE_COUNT,
  bytesToDecimal,
  decimalToBytes,
  formatBinary,
  formatHex,
  isEndianAgnostic,
  parseHex,
  resizeBytes,
} from './lib';

/**
 * Number Converter lib — pure-function tests.
 *
 * Coverage intent:
 *   - parseHex: empty, prefix-stripping, whitespace, odd-length pad,
 *     too-long error, bad-char error.
 *   - formatHex / formatBinary: byte-by-byte rendering, padding.
 *   - bytesToDecimal: every type, both endianness, signed/unsigned wrap.
 *   - decimalToBytes: each type's range checks, hex literal acceptance.
 *   - 64-bit BigInt round-trips past Number.MAX_SAFE_INTEGER.
 *   - IEEE-754 round-trips for known float vectors and the specials
 *     (NaN, ±Infinity).
 *   - Endianness affects multi-byte but not 1-byte types.
 *   - resizeBytes preserves low-order bits across width changes for
 *     each endianness.
 */

describe('parseHex', () => {
  it('returns all-zero bytes for empty input', () => {
    const r = parseHex('', 4);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0, 0, 0, 0]);
    }
  });

  it('returns all-zero bytes for whitespace-only input', () => {
    const r = parseHex('   \t  ', 2);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0, 0]);
    }
  });

  it('parses a basic two-byte hex string', () => {
    const r = parseHex('1234', 2);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0x12, 0x34]);
    }
  });

  it('strips a leading 0x prefix', () => {
    const r = parseHex('0x1234', 2);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0x12, 0x34]);
    }
  });

  it('strips per-byte 0x prefixes and whitespace', () => {
    const r = parseHex('0x12 0x34 0x56 0x78', 4);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0x12, 0x34, 0x56, 0x78]);
    }
  });

  it('strips underscores as separators', () => {
    const r = parseHex('12_34_56_78', 4);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0x12, 0x34, 0x56, 0x78]);
    }
  });

  it('pads odd-length input with a leading zero', () => {
    const r = parseHex('f', 1);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0x0f]);
    }
  });

  it('left-pads with zero bytes when shorter than expected', () => {
    const r = parseHex('ff', 4);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0, 0, 0, 0xff]);
    }
  });

  it('rejects non-hex characters', () => {
    const r = parseHex('12gh', 2);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.message).toMatch(/non-hex/i);
    }
  });

  it('rejects input longer than expected', () => {
    const r = parseHex('1234567890', 2);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.message).toMatch(/too many/i);
    }
  });

  it('accepts uppercase, mixed-case, and lowercase identically', () => {
    const a = parseHex('AB', 1);
    const b = parseHex('Ab', 1);
    const c = parseHex('ab', 1);
    expect(a.kind).toBe('ok');
    expect(b.kind).toBe('ok');
    expect(c.kind).toBe('ok');
    if (a.kind === 'ok' && b.kind === 'ok' && c.kind === 'ok') {
      expect(a.bytes[0]).toBe(0xab);
      expect(b.bytes[0]).toBe(0xab);
      expect(c.bytes[0]).toBe(0xab);
    }
  });
});

describe('formatHex', () => {
  it('formats bytes as space-separated lowercase pairs', () => {
    expect(formatHex(new Uint8Array([0x12, 0x34, 0x56, 0x78]))).toBe(
      '12 34 56 78',
    );
  });

  it('pads each byte to two digits', () => {
    expect(formatHex(new Uint8Array([0x01, 0x0a]))).toBe('01 0a');
  });

  it('renders an empty buffer as the empty string', () => {
    expect(formatHex(new Uint8Array(0))).toBe('');
  });
});

describe('formatBinary', () => {
  it('formats each byte as nibble_nibble with space separators', () => {
    expect(formatBinary(new Uint8Array([0x12, 0x34]))).toBe(
      '0001_0010 0011_0100',
    );
  });

  it('zero-pads each nibble to four bits', () => {
    expect(formatBinary(new Uint8Array([0x01]))).toBe('0000_0001');
  });

  it('represents 0xff as all ones', () => {
    expect(formatBinary(new Uint8Array([0xff]))).toBe('1111_1111');
  });
});

describe('bytesToDecimal — single-byte types', () => {
  it('uint8 — 255 max', () => {
    expect(bytesToDecimal(new Uint8Array([0xff]), 'uint8', 'big')).toBe('255');
  });

  it('int8 — 0xff is -1', () => {
    expect(bytesToDecimal(new Uint8Array([0xff]), 'int8', 'big')).toBe('-1');
  });

  it('int8 — 0x80 is -128 (most-negative)', () => {
    expect(bytesToDecimal(new Uint8Array([0x80]), 'int8', 'big')).toBe('-128');
  });

  it('uint8/int8 are endian-agnostic', () => {
    expect(isEndianAgnostic('uint8')).toBe(true);
    expect(isEndianAgnostic('int8')).toBe(true);
    expect(bytesToDecimal(new Uint8Array([0xff]), 'uint8', 'little')).toBe(
      bytesToDecimal(new Uint8Array([0xff]), 'uint8', 'big'),
    );
  });
});

describe('bytesToDecimal — multi-byte types respect endianness', () => {
  it('uint16 BE: [0x12, 0x34] = 4660', () => {
    expect(bytesToDecimal(new Uint8Array([0x12, 0x34]), 'uint16', 'big')).toBe(
      '4660',
    );
  });

  it('uint16 LE: [0x12, 0x34] = 13330', () => {
    expect(
      bytesToDecimal(new Uint8Array([0x12, 0x34]), 'uint16', 'little'),
    ).toBe('13330');
  });

  it('int16 BE: 0xffff = -1', () => {
    expect(bytesToDecimal(new Uint8Array([0xff, 0xff]), 'int16', 'big')).toBe(
      '-1',
    );
  });

  it('int16 BE: 0x8000 = -32768 (most negative)', () => {
    expect(bytesToDecimal(new Uint8Array([0x80, 0x00]), 'int16', 'big')).toBe(
      '-32768',
    );
  });

  it('uint32 BE: [0x12, 0x34, 0x56, 0x78] = 305419896', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0x12, 0x34, 0x56, 0x78]),
        'uint32',
        'big',
      ),
    ).toBe('305419896');
  });

  it('uint32 LE: byte-swapped representation', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0x12, 0x34, 0x56, 0x78]),
        'uint32',
        'little',
      ),
    ).toBe('2018915346'); // = 0x78563412
  });
});

describe('bytesToDecimal — 64-bit BigInt round-trip past MAX_SAFE_INTEGER', () => {
  it('uint64 BE: 2^53 + 1 (just past Number.MAX_SAFE_INTEGER)', () => {
    // 2^53 + 1 = 9_007_199_254_740_993
    // BE: 00 20 00 00 00 00 00 01
    expect(
      bytesToDecimal(
        new Uint8Array([0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]),
        'uint64',
        'big',
      ),
    ).toBe('9007199254740993');
  });

  it('uint64 BE: max value 2^64 - 1', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        'uint64',
        'big',
      ),
    ).toBe('18446744073709551615');
  });

  it('int64 BE: 0xffffffffffffffff = -1', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        'int64',
        'big',
      ),
    ).toBe('-1');
  });

  it('int64 BE: most negative is -2^63', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        'int64',
        'big',
      ),
    ).toBe('-9223372036854775808');
  });
});

describe('bytesToDecimal — float types (IEEE-754)', () => {
  it('float32 BE: 0x40490fdb ≈ 3.1415927 (single-precision π)', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0x40, 0x49, 0x0f, 0xdb]),
        'float32',
        'big',
      ),
    ).toBe('3.1415927410125732');
  });

  it('float32 BE: 0x00000000 = 0', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0x00, 0x00, 0x00, 0x00]),
        'float32',
        'big',
      ),
    ).toBe('0');
  });

  it('float32 BE: 0x80000000 = -0', () => {
    // Number.toString of -0 is "0", so we accept either representation.
    const r = bytesToDecimal(
      new Uint8Array([0x80, 0x00, 0x00, 0x00]),
      'float32',
      'big',
    );
    expect(r === '0' || r === '-0').toBe(true);
  });

  it('float32 BE: 0x7f800000 = Infinity', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0x7f, 0x80, 0x00, 0x00]),
        'float32',
        'big',
      ),
    ).toBe('Infinity');
  });

  it('float32 BE: 0xff800000 = -Infinity', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0xff, 0x80, 0x00, 0x00]),
        'float32',
        'big',
      ),
    ).toBe('-Infinity');
  });

  it('float32 BE: 0x7fc00000 = NaN', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0x7f, 0xc0, 0x00, 0x00]),
        'float32',
        'big',
      ),
    ).toBe('NaN');
  });

  it('float64 BE: 0x400921fb54442d18 ≈ π', () => {
    expect(
      bytesToDecimal(
        new Uint8Array([0x40, 0x09, 0x21, 0xfb, 0x54, 0x44, 0x2d, 0x18]),
        'float64',
        'big',
      ),
    ).toBe('3.141592653589793');
  });
});

describe('bytesToDecimal — invariant: bytes.length must match BYTE_COUNT', () => {
  it('throws on size mismatch', () => {
    expect(() =>
      bytesToDecimal(new Uint8Array([0x12]), 'uint16', 'big'),
    ).toThrow();
  });
});

describe('decimalToBytes — basic integers', () => {
  it('uint8 of 0', () => {
    const r = decimalToBytes('0', 'uint8', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(Array.from(r.bytes)).toEqual([0]);
  });

  it('uint8 of 255', () => {
    const r = decimalToBytes('255', 'uint8', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(Array.from(r.bytes)).toEqual([0xff]);
  });

  it('uint8 of 256 is out of range', () => {
    const r = decimalToBytes('256', 'uint8', 'big');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.message).toMatch(/uint8/);
      expect(r.message).toMatch(/0\.\.255/);
    }
  });

  it('int8 of -128 (most negative)', () => {
    const r = decimalToBytes('-128', 'int8', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(Array.from(r.bytes)).toEqual([0x80]);
  });

  it('int8 of -129 is out of range', () => {
    const r = decimalToBytes('-129', 'int8', 'big');
    expect(r.kind).toBe('error');
  });

  it('accepts 0x-prefixed hex literals for integer types', () => {
    const r = decimalToBytes('0xff', 'uint8', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(Array.from(r.bytes)).toEqual([0xff]);
  });

  it('accepts negative 0x-prefixed hex literals for signed types', () => {
    const r = decimalToBytes('-0x1', 'int8', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(Array.from(r.bytes)).toEqual([0xff]);
  });

  it('rejects floats for integer types', () => {
    const r = decimalToBytes('1.5', 'uint16', 'big');
    expect(r.kind).toBe('error');
  });

  it('rejects empty input gracefully (returns zeros, not error)', () => {
    const r = decimalToBytes('', 'uint16', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(Array.from(r.bytes)).toEqual([0, 0]);
  });
});

describe('decimalToBytes — endianness affects multi-byte', () => {
  it('uint16 BE: 4660 → [0x12, 0x34]', () => {
    const r = decimalToBytes('4660', 'uint16', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(Array.from(r.bytes)).toEqual([0x12, 0x34]);
  });

  it('uint16 LE: 4660 → [0x34, 0x12]', () => {
    const r = decimalToBytes('4660', 'uint16', 'little');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(Array.from(r.bytes)).toEqual([0x34, 0x12]);
  });
});

describe('decimalToBytes — 64-bit BigInt', () => {
  it('uint64 max value 2^64 - 1', () => {
    const r = decimalToBytes('18446744073709551615', 'uint64', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      ]);
    }
  });

  it('uint64 of 2^64 is out of range', () => {
    const r = decimalToBytes('18446744073709551616', 'uint64', 'big');
    expect(r.kind).toBe('error');
  });

  it('int64 of -1 round-trips through BigInt', () => {
    const r = decimalToBytes('-1', 'int64', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      ]);
    }
  });

  it('int64 most-negative -2^63', () => {
    const r = decimalToBytes('-9223372036854775808', 'int64', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([
        0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
    }
  });

  it('uint64 LE: max value 2^64 - 1 has same bytes (all ones)', () => {
    const beResult = decimalToBytes('18446744073709551615', 'uint64', 'big');
    const leResult = decimalToBytes(
      '18446744073709551615',
      'uint64',
      'little',
    );
    if (beResult.kind === 'ok' && leResult.kind === 'ok') {
      expect(Array.from(leResult.bytes)).toEqual(Array.from(beResult.bytes));
    }
  });
});

describe('decimalToBytes — float types', () => {
  it('float32 of 1.5', () => {
    const r = decimalToBytes('1.5', 'float32', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0x3f, 0xc0, 0x00, 0x00]);
    }
  });

  it('float64 of 0', () => {
    const r = decimalToBytes('0', 'float64', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    }
  });

  it('float32 accepts scientific notation', () => {
    const r = decimalToBytes('1.5e2', 'float32', 'big');
    expect(r.kind).toBe('ok');
    // 150.0 in float32 BE = 0x4316_0000
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0x43, 0x16, 0x00, 0x00]);
    }
  });

  it('float32 accepts the literal "Infinity"', () => {
    const r = decimalToBytes('Infinity', 'float32', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0x7f, 0x80, 0x00, 0x00]);
    }
  });

  it('float32 accepts the literal "-Infinity"', () => {
    const r = decimalToBytes('-Infinity', 'float32', 'big');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([0xff, 0x80, 0x00, 0x00]);
    }
  });

  it('float32 accepts the literal "NaN" (case-insensitive)', () => {
    const r = decimalToBytes('nan', 'float32', 'big');
    expect(r.kind).toBe('ok');
  });

  it('rejects malformed floats with trailing garbage', () => {
    const r = decimalToBytes('1.5xyz', 'float32', 'big');
    expect(r.kind).toBe('error');
  });
});

describe('round-trips: decimalToBytes → bytesToDecimal', () => {
  // Each row: [type, endianness, decimal] — the decimal must come out
  // identical after a round trip.
  const cases: Array<[
    Parameters<typeof decimalToBytes>[1],
    Parameters<typeof decimalToBytes>[2],
    string,
  ]> = [
    ['uint8', 'big', '42'],
    ['int8', 'big', '-42'],
    ['uint16', 'big', '4660'],
    ['uint16', 'little', '4660'],
    ['int16', 'big', '-1'],
    ['uint32', 'big', '305419896'],
    ['int32', 'little', '-2147483648'],
    ['uint64', 'big', '18446744073709551615'],
    ['int64', 'little', '-9223372036854775808'],
    ['float32', 'big', '1.5'],
    ['float64', 'little', '3.141592653589793'],
  ];

  for (const [type, endianness, value] of cases) {
    it(`${type} ${endianness}: ${value}`, () => {
      const r = decimalToBytes(value, type, endianness);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') {
        expect(bytesToDecimal(r.bytes, type, endianness)).toBe(value);
      }
    });
  }
});

describe('resizeBytes', () => {
  it('returns a copy unchanged when sizes match', () => {
    const input = new Uint8Array([0x12, 0x34]);
    const out = resizeBytes(input, 2, 'big');
    expect(Array.from(out)).toEqual([0x12, 0x34]);
    expect(out).not.toBe(input); // distinct buffer
  });

  it('grows BE: pads zeros on the left (high-order)', () => {
    const out = resizeBytes(new Uint8Array([0x12, 0x34]), 4, 'big');
    expect(Array.from(out)).toEqual([0, 0, 0x12, 0x34]);
  });

  it('grows LE: pads zeros on the right (high-order)', () => {
    const out = resizeBytes(new Uint8Array([0x12, 0x34]), 4, 'little');
    expect(Array.from(out)).toEqual([0x12, 0x34, 0, 0]);
  });

  it('shrinks BE: keeps low-order bytes (right side)', () => {
    const out = resizeBytes(
      new Uint8Array([0x12, 0x34, 0x56, 0x78]),
      2,
      'big',
    );
    expect(Array.from(out)).toEqual([0x56, 0x78]);
  });

  it('shrinks LE: keeps low-order bytes (left side)', () => {
    const out = resizeBytes(
      new Uint8Array([0x12, 0x34, 0x56, 0x78]),
      2,
      'little',
    );
    expect(Array.from(out)).toEqual([0x12, 0x34]);
  });

  it('preserves value semantics when growing then shrinking back (BE)', () => {
    const original = new Uint8Array([0x12, 0x34]);
    const grown = resizeBytes(original, 4, 'big');
    const shrunk = resizeBytes(grown, 2, 'big');
    expect(Array.from(shrunk)).toEqual(Array.from(original));
  });
});

describe('BYTE_COUNT — sanity', () => {
  it('matches expected widths', () => {
    expect(BYTE_COUNT.uint8).toBe(1);
    expect(BYTE_COUNT.int8).toBe(1);
    expect(BYTE_COUNT.uint16).toBe(2);
    expect(BYTE_COUNT.int16).toBe(2);
    expect(BYTE_COUNT.uint32).toBe(4);
    expect(BYTE_COUNT.int32).toBe(4);
    expect(BYTE_COUNT.uint64).toBe(8);
    expect(BYTE_COUNT.int64).toBe(8);
    expect(BYTE_COUNT.float32).toBe(4);
    expect(BYTE_COUNT.float64).toBe(8);
  });
});

describe('parseHex — long hex with whitespace stripping', () => {
  it('parses uint64 hex with mixed prefix and spaces', () => {
    const r = parseHex('0x12 34 56 78 90 AB CD EF', 8);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(Array.from(r.bytes)).toEqual([
        0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef,
      ]);
    }
  });
});
