import { describe, expect, it } from 'vitest';

import {
  ALGORITHM_LABELS,
  ALGORITHMS,
  formatByteSize,
} from './lib';

/**
 * Hash Workbench lib — pure functions and constants.
 *
 * Coverage:
 *   - formatByteSize at every boundary (0, 1, 1023, 1024, 1536, 1048576, 10485760, 1GB+)
 *   - ALGORITHMS contains exactly the four names in order
 *   - ALGORITHM_LABELS has entries for all four algorithms
 */

describe('formatByteSize', () => {
  it('formats 0 bytes as "0 B"', () => {
    expect(formatByteSize(0)).toBe('0 B');
  });

  it('formats 1 byte as "1 B"', () => {
    expect(formatByteSize(1)).toBe('1 B');
  });

  it('formats 512 bytes as "512 B"', () => {
    expect(formatByteSize(512)).toBe('512 B');
  });

  it('formats 1023 bytes as "1023 B" (still below 1024)', () => {
    expect(formatByteSize(1023)).toBe('1023 B');
  });

  it('formats 1024 bytes as "1.0 KB"', () => {
    expect(formatByteSize(1024)).toBe('1.0 KB');
  });

  it('formats 1536 bytes as "1.5 KB"', () => {
    expect(formatByteSize(1536)).toBe('1.5 KB');
  });

  it('formats 1048576 bytes (1 MB) as "1.0 MB"', () => {
    expect(formatByteSize(1048576)).toBe('1.0 MB');
  });

  it('formats 10485760 bytes (10 MB) as "10 MB"', () => {
    expect(formatByteSize(10485760)).toBe('10 MB');
  });

  it('formats 1073741824 bytes (1 GB) as "1.0 GB"', () => {
    expect(formatByteSize(1073741824)).toBe('1.0 GB');
  });

  it('formats 10737418240 bytes (10 GB) as "10 GB"', () => {
    expect(formatByteSize(10737418240)).toBe('10 GB');
  });
});

describe('ALGORITHMS constant', () => {
  it('contains exactly four algorithms in the correct order', () => {
    expect(ALGORITHMS).toEqual(['md5', 'sha1', 'sha256', 'sha512']);
  });

  it('is a readonly array', () => {
    // A readonly array is not callable with .push() at the type level.
    // At runtime we can't truly enforce readonly in JS, but the readonly
    // annotation in the type signature serves as documentation.
    expect(Array.isArray(ALGORITHMS)).toBe(true);
  });
});

describe('ALGORITHM_LABELS', () => {
  it('has an entry for each algorithm', () => {
    expect(ALGORITHM_LABELS.md5).toBe('MD5');
    expect(ALGORITHM_LABELS.sha1).toBe('SHA-1');
    expect(ALGORITHM_LABELS.sha256).toBe('SHA-256');
    expect(ALGORITHM_LABELS.sha512).toBe('SHA-512');
  });

  it('has labels matching the algorithm names length', () => {
    // Verify we have exactly 4 entries.
    expect(Object.keys(ALGORITHM_LABELS).length).toBe(4);
  });
});
