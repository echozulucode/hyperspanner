/**
 * Hashing IPC wrappers — typed mirrors of `crate::commands::hash`.
 *
 * Phase 6.4 adds two commands rather than one so we don't pay the
 * JSON-array-of-numbers IPC tax for text inputs. `hashText` keeps the
 * input as a string across the boundary; `hashFile` lets the Rust side
 * read the file directly so the bytes never cross at all.
 *
 * Supported algorithms are a closed string-literal union — the Rust side
 * accepts case/dash variants (e.g. "SHA-256") and normalizes, but from TS
 * we always send the canonical lowercase form. Callers that need looser
 * input handling should lowercase-and-strip on their own side before
 * calling in.
 */

import { invoke } from './invoke';

/**
 * Closed set of hash algorithms supported by the Phase 6.4 backend. See
 * `commands/hash.rs` — adding a new one is a paired Rust+TS change.
 */
export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

/**
 * Response shape. Mirrors the `HashResult` struct on the Rust side
 * (rename_all = "camelCase" → identical keys on both ends).
 */
export interface HashResult {
  /** Lowercase hex, no prefix. */
  digest: string;
  /** Canonical algorithm name the backend hashed under. Always one of the
   *  `HashAlgorithm` literals even if the caller sent a loose spelling. */
  algorithm: string;
  /** Bytes hashed. UTF-8 byte count for `hashText`; file size for `hashFile`. */
  size: number;
}

export interface HashTextOptions {
  text: string;
  algorithm: HashAlgorithm;
}

export interface HashFileOptions {
  path: string;
  algorithm: HashAlgorithm;
  /** Override the default 64 MiB ceiling. Files larger than this reject
   *  with `file_too_large` before any bytes are read or hashed. */
  maxBytes?: number;
}

export function hashText(opts: HashTextOptions): Promise<HashResult> {
  return invoke<HashResult>('hash_text', {
    text: opts.text,
    algorithm: opts.algorithm,
  });
}

export function hashFile(opts: HashFileOptions): Promise<HashResult> {
  return invoke<HashResult>('hash_file', {
    path: opts.path,
    algorithm: opts.algorithm,
    maxBytes: opts.maxBytes,
  });
}
