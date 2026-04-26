/**
 * Pure helpers for the Protobuf Decode tool — types are re-exported from
 * `@/ipc/protobuf` so the tool's state can reference them; this file
 * carries the formatting helpers that don't belong in the IPC layer.
 */

export type { WireField, WireValue, WireTypeCode } from '../../ipc/protobuf';

import type { WireField, WireValue } from '../../ipc/protobuf';

export interface ProtobufDecodeState {
  /** Raw hex pasted by the user. */
  bytesHex: string;
  /** Last decoded field tree. Empty before the first decode or after a
   *  successful empty-input request. */
  fields: WireField[];
  /** True while a decode is in flight (debounced). */
  loading: boolean;
  /** Most recent error from the backend, or null on success. */
  error: { kind: string; message: string } | null;
}

export const DEFAULT_PROTOBUF_DECODE_STATE: ProtobufDecodeState = {
  bytesHex: '',
  fields: [],
  loading: false,
  error: null,
};

/**
 * Count every field in a tree, including nested-message children.
 * Useful for the status pill: "decoded 12 fields across 3 messages".
 */
export function countFields(fields: WireField[]): number {
  let count = 0;
  for (const f of fields) {
    count += 1;
    if (f.value.kind === 'message') {
      count += countFields(f.value.fields);
    }
  }
  return count;
}

/**
 * Render the value as a single-line summary string for inline display.
 * Used by the tree component's collapsed/header rows.
 */
export function summarizeValue(value: WireValue): string {
  switch (value.kind) {
    case 'varint':
      return value.uint === value.int
        ? `varint ${value.uint}`
        : `varint ${value.uint} (signed ${value.int})`;
    case 'fixed32':
      return `fixed32 ${value.uint} / ${value.int} / ${value.float}`;
    case 'fixed64':
      return `fixed64 ${value.uint} / ${value.int} / ${value.float}`;
    case 'message':
      return `message · ${value.fields.length} field${
        value.fields.length === 1 ? '' : 's'
      }`;
    case 'string':
      return `string · ${truncate(value.value, 60)}`;
    case 'bytes':
      return `bytes · ${value.len} byte${value.len === 1 ? '' : 's'} · ${truncate(
        value.hex,
        40,
      )}`;
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
