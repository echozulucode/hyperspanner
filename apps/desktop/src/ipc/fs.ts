/**
 * Filesystem IPC wrappers — typed mirrors of `crate::commands::fs`.
 *
 * These are the only entry points UI code should use to read files. Each
 * wrapper:
 *   - Accepts a typed options object (not positional args) so adding a
 *     new field later doesn't break callers.
 *   - Translates the camelCase option names into the snake_case-at-the-
 *     wire arg names Tauri expects. `maxBytes` → `maxBytes` is untouched
 *     because `#[tauri::command]` already handles the case conversion;
 *     we just mirror the TS field directly.
 *   - Returns the exact response shape Rust sends (already camelCase via
 *     serde's `rename_all = "camelCase"`).
 *
 * Errors bubble as `HyperspannerError` via the `invoke` wrapper.
 */

import { invoke } from './invoke';

/**
 * Result of `readFileBytes`. `bytes` is a plain number array (0-255 per
 * element) — Tauri's default IPC encoding for `Vec<u8>`. Callers that
 * need a `Uint8Array` should do `new Uint8Array(result.bytes)`.
 *
 * This is inefficient for large files; see module doc in
 * `commands/fs.rs` — we'll revisit the transport when Hash Workbench
 * (Phase 6.4) starts pushing >64 MB through the boundary.
 */
export interface FileBytes {
  bytes: number[];
  size: number;
  path: string;
}

export interface FileText {
  text: string;
  size: number;
  path: string;
  encoding: string;
}

export interface ReadFileBytesOptions {
  path: string;
  /** Override the default 64 MiB ceiling. Files larger than this reject
   *  with `file_too_large` before any bytes are read. */
  maxBytes?: number;
}

export interface ReadTextFileOptions {
  path: string;
  /** Encoding label. Phase 6.0 supports "utf-8" (and spelling variants
   *  "utf8", "UTF-8") only; anything else rejects with
   *  `invalid_encoding`. Omit for utf-8 default. */
  encoding?: string;
  maxBytes?: number;
}

export function readFileBytes(opts: ReadFileBytesOptions): Promise<FileBytes> {
  return invoke<FileBytes>('read_file_bytes', {
    path: opts.path,
    maxBytes: opts.maxBytes,
  });
}

export function readTextFile(opts: ReadTextFileOptions): Promise<FileText> {
  return invoke<FileText>('read_text_file', {
    path: opts.path,
    encoding: opts.encoding,
    maxBytes: opts.maxBytes,
  });
}
