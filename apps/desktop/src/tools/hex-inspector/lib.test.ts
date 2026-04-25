import { describe, expect, it } from 'vitest';

import {
  formatHexRows,
  formatOffsetLabel,
  PAGE_ROWS,
  totalRows,
} from './lib';

/**
 * Hex Inspector lib — pure-function tests.
 *
 * Focus areas:
 *   - Empty input handling
 *   - Exact 16-byte rows with proper hex formatting and middle gap
 *   - Partial trailing rows with correct space padding
 *   - Non-printable byte handling (. in ASCII column)
 *   - Offset label formatting (8-digit hex, lowercase)
 *   - Row count calculations
 *   - Pagination boundaries
 */

describe('formatOffsetLabel', () => {
  it('formats zero as 8-digit lowercase hex', () => {
    expect(formatOffsetLabel(0)).toBe('00000000');
  });

  it('formats small offsets with zero-padding', () => {
    expect(formatOffsetLabel(1)).toBe('00000001');
    expect(formatOffsetLabel(255)).toBe('000000ff');
  });

  it('formats larger offsets correctly', () => {
    expect(formatOffsetLabel(0x100)).toBe('00000100');
    expect(formatOffsetLabel(0xdeadbeef)).toBe('deadbeef');
  });
});

describe('totalRows', () => {
  it('returns 0 for empty input', () => {
    expect(totalRows(0)).toBe(0);
  });

  it('returns 1 for 1-16 bytes', () => {
    expect(totalRows(1)).toBe(1);
    expect(totalRows(15)).toBe(1);
    expect(totalRows(16)).toBe(1);
  });

  it('returns 2 for 17-32 bytes', () => {
    expect(totalRows(17)).toBe(2);
    expect(totalRows(32)).toBe(2);
  });

  it('returns 64 for 1024 bytes (PAGE_ROWS)', () => {
    expect(totalRows(1024)).toBe(64);
  });

  it('returns 128 for 2048 bytes', () => {
    expect(totalRows(2048)).toBe(128);
  });
});

describe('formatHexRows', () => {
  it('returns empty array for empty input', () => {
    const rows = formatHexRows(new Uint8Array(0));
    expect(rows).toEqual([]);
  });

  it('formats exactly 16 bytes into 1 row with middle gap', () => {
    const bytes = new Uint8Array([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, // "Hello Wo"
      0x72, 0x6c, 0x64, 0x0a, 0x54, 0x68, 0x69, 0x73, // "rld.This"
    ]);
    const rows = formatHexRows(bytes);

    expect(rows).toHaveLength(1);
    expect(rows[0].offset).toBe(0);
    // Verify hex contains the space gap after byte 8
    expect(rows[0].hex).toMatch(/^([0-9a-f]{2}\s){7}[0-9a-f]{2}\s\s([0-9a-f]{2}\s){7}[0-9a-f]{2}/);
    expect(rows[0].ascii).toBe('Hello Wo rld.This');
  });

  it('handles 3 trailing bytes with proper padding', () => {
    const bytes = new Uint8Array([0x74, 0x2e, 0x00]); // "t" "." NUL
    const rows = formatHexRows(bytes);

    expect(rows).toHaveLength(1);
    // Hex should be "74 2e 00" followed by spaces to reach full width (49 chars)
    expect(rows[0].hex).toMatch(/^74\s2e\s00\s+$/);
    // ASCII should be "t.." padded with spaces to 16 chars
    expect(rows[0].ascii).toBe('t..             ');
  });

  it('formats 2 rows from 17 bytes', () => {
    const bytes = new Uint8Array(17);
    bytes.fill(0xff); // All 0xFF (non-printable)
    const rows = formatHexRows(bytes);

    expect(rows).toHaveLength(2);
    expect(rows[0].offset).toBe(0);
    expect(rows[1].offset).toBe(16);
    // Second row is partial, ASCII should be "." x 1 padded to 16
    expect(rows[1].ascii).toBe('.               ');
  });

  it('renders 0x00 byte as . in ASCII column', () => {
    const bytes = new Uint8Array([0x00, 0x41, 0x42]); // NUL "A" "B"
    const rows = formatHexRows(bytes);
    expect(rows[0].ascii).toMatch(/^\.AB\s+$/);
  });

  it('renders 0xFF byte as . in ASCII column', () => {
    const bytes = new Uint8Array([0xff]);
    const rows = formatHexRows(bytes);
    expect(rows[0].ascii).toMatch(/^\.\s+$/);
  });

  it('renders 0x1F byte as . in ASCII column', () => {
    const bytes = new Uint8Array([0x1f]);
    const rows = formatHexRows(bytes);
    expect(rows[0].ascii).toMatch(/^\.\s+$/);
  });

  it('renders space byte (0x20) as literal space in ASCII column', () => {
    const bytes = new Uint8Array([0x20]);
    const rows = formatHexRows(bytes);
    // First char should be a space, then 15 padding spaces
    expect(rows[0].ascii).toBe('                ');
  });

  it('renders tilde byte (0x7E) as literal tilde in ASCII column', () => {
    const bytes = new Uint8Array([0x7e]); // '~'
    const rows = formatHexRows(bytes);
    expect(rows[0].ascii[0]).toBe('~');
  });

  it('renders DEL byte (0x7F) as . in ASCII column', () => {
    const bytes = new Uint8Array([0x7f]);
    const rows = formatHexRows(bytes);
    expect(rows[0].ascii).toMatch(/^\.\s+$/);
  });

  it('respects startRow and rowCount pagination parameters', () => {
    // 1024 bytes = 64 rows
    const bytes = new Uint8Array(1024);
    bytes.fill(0x42); // Fill with 'B'

    // Request rows 0-31 (PAGE_ROWS default)
    const firstPage = formatHexRows(bytes, 0, PAGE_ROWS);
    expect(firstPage).toHaveLength(PAGE_ROWS);
    expect(firstPage[0].offset).toBe(0);
    expect(firstPage[PAGE_ROWS - 1].offset).toBe((PAGE_ROWS - 1) * 16);

    // Request rows 32-63
    const secondPage = formatHexRows(bytes, PAGE_ROWS, PAGE_ROWS);
    expect(secondPage).toHaveLength(PAGE_ROWS);
    expect(secondPage[0].offset).toBe(PAGE_ROWS * 16);
    expect(secondPage[PAGE_ROWS - 1].offset).toBe((64 - 1) * 16);
  });

  it('returns empty array when startRow is past the end', () => {
    const bytes = new Uint8Array(32);
    const rows = formatHexRows(bytes, 100, PAGE_ROWS);
    expect(rows).toEqual([]);
  });

  it('clamps rowCount to avoid exceeding the file end', () => {
    const bytes = new Uint8Array(64); // 4 rows
    const rows = formatHexRows(bytes, 2, PAGE_ROWS); // Ask for 64 rows starting at row 2
    expect(rows).toHaveLength(2); // Only rows 2-3 exist
    expect(rows[0].offset).toBe(32);
    expect(rows[1].offset).toBe(48);
  });
});
