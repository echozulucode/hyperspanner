/**
 * Pure hash operations for the Hash Workbench tool.
 *
 * This module exports constants, types, and helper functions that are
 * deliberately free of React, Tauri, or store imports so they stay
 * trivially unit-testable. The tool component is the only thing that
 * wires these functions up to IPC and UI state.
 */

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

export interface HashResult {
  digest: string;
  algorithm: string;
  size: number;
}

export interface HashWorkbenchState {
  mode: 'text' | 'file';
  text: string;
  filePath: string;
  /** Most recent results, keyed by algorithm. Null = not yet computed or
   *  superseded by newer input. */
  results: {
    md5: HashResult | null;
    sha1: HashResult | null;
    sha256: HashResult | null;
    sha512: HashResult | null;
  };
  /** True while an async compute batch is in flight. */
  loading: boolean;
  /** Most recent error (e.g. file not found). Cleared on next successful compute. */
  error: { kind: string; message: string } | null;
}

/** The ordered list of supported hash algorithms. */
export const ALGORITHMS: readonly HashAlgorithm[] = [
  'md5',
  'sha1',
  'sha256',
  'sha512',
];

/** Display labels for each algorithm. */
export const ALGORITHM_LABELS: Record<HashAlgorithm, string> = {
  md5: 'MD5',
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha512: 'SHA-512',
};

/**
 * Convert bytes to a human-readable size label.
 *
 * Uses 1024-based units (KiB semantics) with two significant digits above 1 KB.
 * Labels use KB/MB/GB for familiarity (matching developer-tool conventions)
 * rather than the technically correct KiB/MiB/GiB.
 *
 * Examples:
 *   0 → "0 B"
 *   512 → "512 B"
 *   1024 → "1.0 KB"
 *   1536 → "1.5 KB"
 *   1048576 → "1.0 MB"
 *   10485760 → "10 MB"
 *   1073741824 → "1.0 GB"
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
