/**
 * Pure number-conversion operations for the Number Converter tool.
 *
 * Bidirectional hex ↔ decimal binding for the standard fixed-width numeric
 * types (uint8/int8 ... uint64/int64, float32/float64) under big- or
 * little-endian interpretation. JS-only — no Rust backend, since `DataView`
 * + `BigInt` cover every conversion losslessly (including IEEE-754 round
 * trips and >`Number.MAX_SAFE_INTEGER` integers).
 *
 * Why bytes are stored left-to-right (typing order) regardless of
 * endianness: hex displays bytes the way they sit in memory; endianness
 * only governs how those bytes are interpreted as a multi-byte number.
 * That keeps the hex field a stable representation the user can paste in
 * and out of, and matches how every hex viewer in existence renders bytes.
 */

export type Endianness = 'big' | 'little';

export type NumberType =
  | 'uint8'
  | 'int8'
  | 'uint16'
  | 'int16'
  | 'uint32'
  | 'int32'
  | 'uint64'
  | 'int64'
  | 'float32'
  | 'float64';

/** Display labels for the type dropdown. The strings here are also the
 *  canonical TypeScript identifiers so we can use the same value as both
 *  state value and label without a lookup table for the common case. */
export const TYPES: readonly NumberType[] = [
  'uint8',
  'int8',
  'uint16',
  'int16',
  'uint32',
  'int32',
  'uint64',
  'int64',
  'float32',
  'float64',
];

/** Byte width of each supported type. */
export const BYTE_COUNT: Record<NumberType, number> = {
  uint8: 1,
  int8: 1,
  uint16: 2,
  int16: 2,
  uint32: 4,
  int32: 4,
  uint64: 8,
  int64: 8,
  float32: 4,
  float64: 8,
};

/** True when this type is single-byte (endianness has no effect). The
 *  Endianness dropdown stays enabled either way for visual consistency,
 *  but `bytesToDecimal` / `decimalToBytes` short-circuit endianness when
 *  the value is true here. */
export function isEndianAgnostic(type: NumberType): boolean {
  return BYTE_COUNT[type] === 1;
}

/* ---------- Result discriminated union ---------- */

export interface ParseOk {
  kind: 'ok';
  bytes: Uint8Array;
}
export interface ParseError {
  kind: 'error';
  message: string;
}
export type ParseResult = ParseOk | ParseError;

/* ---------- Hex parsing & formatting ---------- */

/**
 * Parse a hex string into a `Uint8Array` of length `expectedBytes`.
 *
 * Lenient: strips `0x` prefixes (anywhere), whitespace, and underscores.
 * Pads odd-length input with a single leading zero (so typing `f` for a
 * uint8 yields `0x0f`). Pads with leading zero BYTES if the cleaned input
 * has fewer bytes than expected.
 *
 * Strict: rejects non-hex characters and inputs longer than expected.
 *
 * Empty / whitespace-only input is considered ok and produces an
 * all-zero byte array so the dependent decimal/binary fields render
 * something sensible rather than going blank.
 */
export function parseHex(input: string, expectedBytes: number): ParseResult {
  if (input.trim().length === 0) {
    return { kind: 'ok', bytes: new Uint8Array(expectedBytes) };
  }

  // Strip `0x` prefixes (case-insensitive, anywhere) and any whitespace
  // or underscore separators users like to type for legibility.
  let cleaned = input.replace(/0x/gi, '').replace(/[\s_]/g, '').toLowerCase();

  if (cleaned.length === 0) {
    return { kind: 'ok', bytes: new Uint8Array(expectedBytes) };
  }

  if (!/^[0-9a-f]+$/.test(cleaned)) {
    return { kind: 'error', message: 'Hex contains non-hex characters' };
  }

  // Pad to even length so `f` → `0f` etc.
  if (cleaned.length % 2 === 1) {
    cleaned = '0' + cleaned;
  }

  const byteCount = cleaned.length / 2;
  if (byteCount > expectedBytes) {
    return {
      kind: 'error',
      message: `${byteCount} bytes is too many for a ${expectedBytes}-byte type`,
    };
  }

  // Left-pad with zero bytes so a partially-typed number sits in the
  // low-order position (matches how integer literals work).
  const bytes = new Uint8Array(expectedBytes);
  const offset = expectedBytes - byteCount;
  for (let i = 0; i < byteCount; i++) {
    bytes[offset + i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }

  return { kind: 'ok', bytes };
}

/**
 * Format a `Uint8Array` as space-separated lowercase hex pairs.
 *
 * `formatHex(new Uint8Array([0x12, 0x34, 0x56, 0x78]))` → `"12 34 56 78"`.
 */
export function formatHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
}

/**
 * Format a `Uint8Array` as space-separated bytes with nibble-grouped
 * underscores inside each byte for legibility.
 *
 * `formatBinary(new Uint8Array([0x12, 0x34]))` →
 *   `"0001_0010 0011_0100"`.
 */
export function formatBinary(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => {
    const bin = b.toString(2).padStart(8, '0');
    return `${bin.slice(0, 4)}_${bin.slice(4)}`;
  }).join(' ');
}

/* ---------- Bytes ↔ decimal value ---------- */

/**
 * Interpret `bytes` as a value of the given `type` under the given
 * `endianness` and return the decimal string representation.
 *
 * For 64-bit integer types the result is a `BigInt.toString()` so we
 * never silently lose precision past `Number.MAX_SAFE_INTEGER`.
 * For float types the result is `Number.prototype.toString()` which
 * uses the shortest-round-trip representation per ECMA-262.
 *
 * Throws if `bytes.length !== BYTE_COUNT[type]`. Callers should ensure
 * the right-sized buffer (this is an internal invariant; the component
 * always passes a `parseHex(..., BYTE_COUNT[type])` result).
 */
export function bytesToDecimal(
  bytes: Uint8Array,
  type: NumberType,
  endianness: Endianness,
): string {
  const expected = BYTE_COUNT[type];
  if (bytes.length !== expected) {
    throw new Error(
      `bytesToDecimal: ${type} expects ${expected} bytes, got ${bytes.length}`,
    );
  }

  // Build a fresh ArrayBuffer so DataView's view is correctly aligned —
  // a Uint8Array passed in from outside might be a subarray of a larger
  // buffer with a non-zero byteOffset that DataView doesn't inherit.
  const buffer = new ArrayBuffer(expected);
  new Uint8Array(buffer).set(bytes);
  const view = new DataView(buffer);
  const le = endianness === 'little';

  switch (type) {
    case 'uint8':
      return view.getUint8(0).toString();
    case 'int8':
      return view.getInt8(0).toString();
    case 'uint16':
      return view.getUint16(0, le).toString();
    case 'int16':
      return view.getInt16(0, le).toString();
    case 'uint32':
      return view.getUint32(0, le).toString();
    case 'int32':
      return view.getInt32(0, le).toString();
    case 'uint64':
      return view.getBigUint64(0, le).toString();
    case 'int64':
      return view.getBigInt64(0, le).toString();
    case 'float32':
      return view.getFloat32(0, le).toString();
    case 'float64':
      return view.getFloat64(0, le).toString();
  }
}

/**
 * Parse a decimal/integer/float string into bytes for the given type,
 * laid out in the given endianness.
 *
 * Integer types accept:
 *   - decimal literals: `42`, `-17`
 *   - hex literals via `0x` prefix: `0xff`, `-0x10`
 *
 * Float types accept anything `parseFloat` accepts (decimal,
 * scientific notation), plus the literal strings `Infinity`,
 * `-Infinity`, `NaN` (case-insensitive).
 *
 * Range-checks against the type's bounds. Returns a `ParseError` with a
 * range-suggesting message on out-of-range, malformed, or empty input
 * (empty input maps to all-zero bytes — the same convention as
 * `parseHex`).
 */
export function decimalToBytes(
  input: string,
  type: NumberType,
  endianness: Endianness,
): ParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { kind: 'ok', bytes: new Uint8Array(BYTE_COUNT[type]) };
  }

  const buffer = new ArrayBuffer(BYTE_COUNT[type]);
  const view = new DataView(buffer);
  const le = endianness === 'little';

  switch (type) {
    case 'uint8': {
      const n = parseSignedIntStrict(trimmed);
      if (n === null) return errInvalidInt();
      if (n < 0 || n > 0xff) return errOutOfRange('uint8', '0..255');
      view.setUint8(0, n);
      break;
    }
    case 'int8': {
      const n = parseSignedIntStrict(trimmed);
      if (n === null) return errInvalidInt();
      if (n < -0x80 || n > 0x7f) return errOutOfRange('int8', '-128..127');
      view.setInt8(0, n);
      break;
    }
    case 'uint16': {
      const n = parseSignedIntStrict(trimmed);
      if (n === null) return errInvalidInt();
      if (n < 0 || n > 0xffff) return errOutOfRange('uint16', '0..65,535');
      view.setUint16(0, n, le);
      break;
    }
    case 'int16': {
      const n = parseSignedIntStrict(trimmed);
      if (n === null) return errInvalidInt();
      if (n < -0x8000 || n > 0x7fff)
        return errOutOfRange('int16', '-32,768..32,767');
      view.setInt16(0, n, le);
      break;
    }
    case 'uint32': {
      const n = parseSignedIntStrict(trimmed);
      if (n === null) return errInvalidInt();
      if (n < 0 || n > 0xffffffff)
        return errOutOfRange('uint32', '0..4,294,967,295');
      view.setUint32(0, n, le);
      break;
    }
    case 'int32': {
      const n = parseSignedIntStrict(trimmed);
      if (n === null) return errInvalidInt();
      if (n < -0x80000000 || n > 0x7fffffff)
        return errOutOfRange('int32', '-2,147,483,648..2,147,483,647');
      view.setInt32(0, n, le);
      break;
    }
    case 'uint64': {
      const n = parseBigIntStrict(trimmed);
      if (n === null) return errInvalidInt();
      const max = (1n << 64n) - 1n;
      if (n < 0n || n > max)
        return errOutOfRange('uint64', '0..18,446,744,073,709,551,615');
      view.setBigUint64(0, n, le);
      break;
    }
    case 'int64': {
      const n = parseBigIntStrict(trimmed);
      if (n === null) return errInvalidInt();
      const min = -(1n << 63n);
      const max = (1n << 63n) - 1n;
      if (n < min || n > max)
        return errOutOfRange(
          'int64',
          '-9,223,372,036,854,775,808..9,223,372,036,854,775,807',
        );
      view.setBigInt64(0, n, le);
      break;
    }
    case 'float32': {
      const n = parseFloatStrict(trimmed);
      if (n === null) return errInvalidFloat();
      view.setFloat32(0, n, le);
      break;
    }
    case 'float64': {
      const n = parseFloatStrict(trimmed);
      if (n === null) return errInvalidFloat();
      view.setFloat64(0, n, le);
      break;
    }
  }

  return { kind: 'ok', bytes: new Uint8Array(buffer) };
}

/* ---------- Resize bytes when type width changes ---------- */

/**
 * Resize a byte array to a new byte count, preserving as much of the
 * original numeric value as possible under the given endianness.
 *
 * Growing: pads with zero bytes on the high-order side (left for big,
 * right for little) — equivalent to widening an unsigned integer.
 * Shrinking: drops the high-order bytes — matches C's downcast semantics
 * (keeps low bits, discards high bits).
 */
export function resizeBytes(
  bytes: Uint8Array,
  newByteCount: number,
  endianness: Endianness,
): Uint8Array {
  if (bytes.length === newByteCount) return new Uint8Array(bytes);

  const result = new Uint8Array(newByteCount);
  const big = endianness === 'big';

  if (newByteCount > bytes.length) {
    // Grow: pad with zeros on the high-order side.
    if (big) {
      result.set(bytes, newByteCount - bytes.length); // existing → right
    } else {
      result.set(bytes, 0); // existing → left, zeros at right
    }
  } else {
    // Shrink: keep the low-order bytes, drop the high-order.
    if (big) {
      result.set(bytes.subarray(bytes.length - newByteCount));
    } else {
      result.set(bytes.subarray(0, newByteCount));
    }
  }

  return result;
}

/* ---------- Internal parse helpers ---------- */

/** Strict signed-integer parser. Accepts decimal or `0x...` hex with an
 *  optional leading minus. Rejects floats, separators, and empty input
 *  (callers screen for empty separately). Returns `null` on any
 *  malformed input. */
function parseSignedIntStrict(s: string): number | null {
  if (/^-?0x[0-9a-fA-F]+$/.test(s)) {
    const n = parseInt(s, 16); // parseInt handles leading minus
    return Number.isNaN(n) ? null : n;
  }
  if (/^-?\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Same as `parseSignedIntStrict` but returns a `bigint` — used for the
 *  64-bit types where `Number` would lose precision past 2^53. */
function parseBigIntStrict(s: string): bigint | null {
  try {
    if (/^-?0x[0-9a-fA-F]+$/.test(s)) {
      // BigInt(string) accepts `0x` prefix natively and handles the
      // leading minus on the outer layer.
      if (s.startsWith('-')) {
        return -BigInt(s.slice(1));
      }
      return BigInt(s);
    }
    if (/^-?\d+$/.test(s)) {
      return BigInt(s);
    }
    return null;
  } catch {
    return null;
  }
}

/** Strict float parser. Accepts the same syntax as `Number(...)` (decimal,
 *  scientific) plus the literal tokens `Infinity`, `-Infinity`, `NaN`
 *  (case-insensitive). Returns `null` for malformed input. */
function parseFloatStrict(s: string): number | null {
  const lower = s.toLowerCase();
  if (lower === 'nan') return Number.NaN;
  if (lower === 'infinity' || lower === '+infinity') return Number.POSITIVE_INFINITY;
  if (lower === '-infinity') return Number.NEGATIVE_INFINITY;

  // `Number(s)` is stricter than `parseFloat` — `Number('1.5xyz')` is
  // NaN, while `parseFloat('1.5xyz')` is 1.5. We want the strict form
  // so trailing junk doesn't silently round-trip.
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

function errInvalidInt(): ParseError {
  return { kind: 'error', message: 'Not a valid integer' };
}
function errInvalidFloat(): ParseError {
  return { kind: 'error', message: 'Not a valid float' };
}
function errOutOfRange(type: string, range: string): ParseError {
  return { kind: 'error', message: `Out of ${type} range (${range})` };
}
