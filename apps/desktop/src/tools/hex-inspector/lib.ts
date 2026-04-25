/**
 * Pure hex formatting for the Hex Inspector tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable and can be reused by a potential future
 * backend-accelerated path. The tool component is the only thing that
 * wires these functions up to UI state.
 */

export const HEX_BYTES_PER_ROW = 16;
export const PAGE_ROWS = 64;

export interface HexRow {
  /** 0-based byte offset of the first byte in this row (0, 16, 32, ...). */
  offset: number;
  /** Formatted hex string with middle gap (e.g. "48 65 6c 6c 6f 20 57 6f  72 6c 64 0a ...").
   *  Shorter rows are space-padded to keep the ASCII panel aligned. */
  hex: string;
  /** Printable ASCII rendering with '.' for non-printable. Always 16 chars wide. */
  ascii: string;
}

/**
 * Format an 8-digit hex offset in lowercase, zero-padded.
 * e.g. formatOffsetLabel(48) → "00000030", formatOffsetLabel(0xDEADBEEF) → "deadbeef"
 */
export function formatOffsetLabel(offset: number): string {
  return offset.toString(16).padStart(8, '0');
}

/**
 * Compute the total number of rows needed to display byteCount bytes.
 * e.g. totalRows(0) → 0, totalRows(16) → 1, totalRows(17) → 2
 */
export function totalRows(byteCount: number): number {
  if (byteCount === 0) return 0;
  return Math.ceil(byteCount / HEX_BYTES_PER_ROW);
}

/**
 * Format a window of hex rows from the given byte array.
 *
 * @param bytes       The raw bytes to format
 * @param startRow    The 0-based row index to start from (default 0)
 * @param rowCount    The number of rows to generate (default PAGE_ROWS)
 * @returns           An array of HexRow objects, or [] if startRow is past the end
 *
 * Each row displays 16 bytes in hex with a middle gap:
 *   "48 65 6c 6c 6f 20 57 6f  72 6c 64 0a 54 68 69 73  |Hello World.This|"
 *
 * Partial rows (fewer than 16 bytes) are space-padded in the hex section to keep
 * the ASCII panel aligned, and space-padded in the ASCII section to exactly 16 chars.
 */
export function formatHexRows(
  bytes: Uint8Array,
  startRow: number = 0,
  rowCount: number = PAGE_ROWS,
): HexRow[] {
  const result: HexRow[] = [];
  const totalByteCount = bytes.length;
  const totalRowCount = totalRows(totalByteCount);

  // Clamp startRow to valid range
  if (startRow < 0 || startRow >= totalRowCount) {
    return [];
  }

  // Clamp rowCount to avoid going past the end
  const endRow = Math.min(startRow + rowCount, totalRowCount);

  for (let rowIdx = startRow; rowIdx < endRow; rowIdx++) {
    const byteOffset = rowIdx * HEX_BYTES_PER_ROW;
    const rowBytes = bytes.slice(byteOffset, byteOffset + HEX_BYTES_PER_ROW);

    // Format hex: pairs separated by spaces, with a double space after byte 8.
    // Build as two halves and join with extra space.
    const hex1: string[] = [];
    const hex2: string[] = [];
    for (let i = 0; i < rowBytes.length; i++) {
      const byte = rowBytes[i];
      const hex = byte.toString(16).padStart(2, '0');
      if (i < 8) {
        hex1.push(hex);
      } else {
        hex2.push(hex);
      }
    }

    // Join each half with single spaces, then combine with double space gap.
    // Full width example: "48 65 6c 6c 6f 20 57 6f  72 6c 64 0a 54 68 69 73" (49 chars)
    let hex = hex1.join(' ') + '  ' + hex2.join(' ');

    // Pad to full width (49 chars for 16 bytes, proportionally less for partial rows)
    const expectedHexLength = 16 * 3 - 1 + 1; // 49 chars for full row
    if (hex.length < expectedHexLength) {
      hex = hex.padEnd(expectedHexLength, ' ');
    }

    // Format ASCII: printable chars (0x20..0x7e) as-is, others as '.'
    let ascii = '';
    for (const byte of rowBytes) {
      if (byte >= 0x20 && byte <= 0x7e) {
        ascii += String.fromCharCode(byte);
      } else {
        ascii += '.';
      }
    }
    // Pad to 16 chars with spaces
    ascii = ascii.padEnd(16, ' ');

    result.push({
      offset: byteOffset,
      hex,
      ascii,
    });
  }

  return result;
}
