/**
 * IPC barrel — the only module UI code should import from.
 *
 * Re-exports the typed command wrappers, the error taxonomy, and the
 * low-level `invoke` seam. Keeping imports centralized here gives us a
 * single chokepoint to instrument (logging, tracing) when that becomes
 * useful, and prevents accidental direct use of `@tauri-apps/api/core`
 * from anywhere in `src/`.
 */

export { HyperspannerError, toHyperspannerError } from './errors';
export type { HyperspannerErrorKind } from './errors';

export { invoke, __setInvokeForTests } from './invoke';
export type { InvokeFn } from './invoke';

export { readFileBytes, readTextFile } from './fs';
export type {
  FileBytes,
  FileText,
  ReadFileBytesOptions,
  ReadTextFileOptions,
} from './fs';
