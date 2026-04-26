/**
 * Schema-less protobuf decoder — typed mirror of `crate::commands::protobuf`.
 *
 * The MVP is intentionally schema-less: input is a hex string of raw
 * protobuf wire bytes, output is a tree of `WireField`s carrying the
 * field number, wire type, and a wire-typed value. The Rust side
 * speculatively recurses on length-delimited fields to surface nested
 * messages where it can, falling back to UTF-8 strings or bytes.
 *
 * If a future revision wants schema-driven decoding (with `.proto` text
 * + a message-type name → semantically-named field labels), that's a
 * second command — keep this one focused.
 */

import { invoke } from './invoke';

/** One byte's worth of wire-type code. The Rust side rejects 3 (start-group)
 *  and 4 (end-group) since they're deprecated. */
export type WireTypeCode = 0 | 1 | 2 | 5;

/** Discriminated union mirroring `WireValue` on the Rust side. The `kind`
 *  tag picks between the four interpretation modes. `string` and `bytes`
 *  are used for length-delimited (wire type 2) fields that didn't parse
 *  cleanly as a nested message. */
export type WireValue =
  | { kind: 'varint'; uint: string; int: string }
  | { kind: 'fixed32'; uint: number; int: number; float: number }
  | { kind: 'fixed64'; uint: string; int: string; float: number }
  | { kind: 'message'; fields: WireField[] }
  | { kind: 'string'; value: string }
  | { kind: 'bytes'; hex: string; len: number };

export interface WireField {
  field: number;
  wireType: WireTypeCode;
  wireTypeLabel: string;
  value: WireValue;
}

export interface DecodeProtobufOptions {
  /** Hex-encoded raw protobuf bytes. The Rust side tolerates `0x` prefixes,
   *  whitespace, and underscores so the user can paste formatted hex. */
  bytesHex: string;
}

/** Decode the payload into a flat list of top-level fields (each field
 *  may itself contain nested fields via the `message` value variant). */
export function decodeProtobuf(opts: DecodeProtobufOptions): Promise<WireField[]> {
  return invoke<WireField[]>('decode_protobuf', {
    bytesHex: opts.bytesHex,
  });
}
