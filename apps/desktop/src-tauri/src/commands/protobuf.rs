//! Schema-less protobuf wire-format decoder.
//!
//! Parses raw protobuf bytes (no `.proto` schema required) and returns a
//! structured representation of every field it sees. The output is a tree
//! of `WireField`s that the UI renders as an indented "what fields and
//! wire types are in this payload" view — useful for inspecting unknown
//! protobuf payloads, RPC traces, and shipped binaries.
//!
//! Why schema-less:
//!   - Schema-based decoding (via `prost-reflect` + a `.proto` parser
//!     like `protox`) requires the user to supply a `.proto` schema and
//!     a fully-qualified message type name. That's a lot of UX surface
//!     for an MVP.
//!   - Schema-less decoding works on every protobuf payload the same
//!     way; it just reports the field number and the wire-typed value
//!     without semantic interpretation. For length-delimited fields the
//!     decoder also tries to recurse (in case the value is a nested
//!     message) and falls back to bytes / utf-8 string if recursion
//!     doesn't consume the buffer cleanly.
//!
//! Wire format reference (from
//! https://protobuf.dev/programming-guides/encoding/):
//!   - Each field is a varint tag = `(field_number << 3) | wire_type`.
//!   - Wire types: 0=varint, 1=64-bit, 2=length-delimited, 3=start-group
//!     (deprecated), 4=end-group (deprecated), 5=32-bit.
//!   - We support 0/1/2/5 and reject 3/4 with `MalformedProtobuf`.

use serde::Serialize;

use crate::error::{HyperspannerError, HyperspannerResult};

/// Maximum recursion depth when speculatively decoding a length-delimited
/// field as a nested message. Prevents pathological inputs from blowing
/// the stack.
const MAX_NESTED_DEPTH: u32 = 32;

/// One decoded field. Camel-cased to match the TS-side type that mirrors
/// this shape across the IPC boundary.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WireField {
    /// Field number from the tag (e.g. `1`, `2`, `42`).
    pub field: u32,
    /// Wire type code: 0/1/2/5. (3 and 4 are start/end-group and rejected.)
    pub wire_type: u8,
    /// Human-readable label for the wire type — saves the UI the lookup.
    pub wire_type_label: &'static str,
    /// The decoded value. `Option` because some shapes (varint, fixed
    /// numerics) carry a numeric value, while others (nested message) carry
    /// a children list. The variant carrying the data is selected by
    /// matching `wire_type`.
    pub value: WireValue,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum WireValue {
    /// Wire type 0. Carries an unsigned 64-bit integer (could also be
    /// reinterpreted as int64, sint32, sint64, bool, enum — we don't
    /// know without a schema).
    #[serde(rename = "varint")]
    Varint { uint: String, int: String },
    /// Wire type 5 (32-bit). Could be a fixed32, sfixed32, or float.
    /// We surface all three interpretations.
    #[serde(rename = "fixed32")]
    Fixed32 {
        uint: u32,
        int: i32,
        float: f32,
    },
    /// Wire type 1 (64-bit). Could be a fixed64, sfixed64, or double.
    #[serde(rename = "fixed64")]
    Fixed64 {
        uint: String,
        int: String,
        float: f64,
    },
    /// Wire type 2 (length-delimited). Either a successfully decoded
    /// nested message (when the bytes parse cleanly as protobuf), or a
    /// printable UTF-8 string, or raw bytes — we pick the most
    /// informative interpretation that's consistent with the data.
    #[serde(rename = "message")]
    Message { fields: Vec<WireField> },
    #[serde(rename = "string")]
    String { value: String },
    #[serde(rename = "bytes")]
    Bytes { hex: String, len: usize },
}

/// Decode the full hex-encoded protobuf payload into a tree of fields.
#[tauri::command]
pub fn decode_protobuf(bytes_hex: String) -> HyperspannerResult<Vec<WireField>> {
    let cleaned = bytes_hex
        .replace("0x", "")
        .replace(' ', "")
        .replace('\n', "")
        .replace('\t', "")
        .replace('_', "");
    let bytes = hex::decode(&cleaned).map_err(|e| HyperspannerError::InvalidHex {
        detail: format!("{e}"),
    })?;
    decode_message(&bytes, 0)
}

/// Parse `bytes` as a sequence of protobuf fields. Used both for the
/// top-level payload and for speculative nested-message decoding.
fn decode_message(bytes: &[u8], depth: u32) -> HyperspannerResult<Vec<WireField>> {
    let mut fields = Vec::new();
    let mut cursor = 0usize;
    while cursor < bytes.len() {
        let start = cursor;
        let (tag, used) = read_varint(bytes, cursor)?;
        cursor += used;
        // u64 tag → (field, wire_type) — defensive cast: protobuf field
        // numbers are spec'd to fit u32 (max 2^29 - 1), and wire_type is
        // 3 bits.
        let wire_type = (tag & 0b0000_0111) as u8;
        let field_number = (tag >> 3) as u32;
        if field_number == 0 {
            return Err(HyperspannerError::MalformedProtobuf {
                offset: start,
                detail: "field number 0 is reserved".into(),
            });
        }

        let (value, consumed) = match wire_type {
            0 => decode_varint_value(bytes, cursor)?,
            1 => decode_fixed64(bytes, cursor)?,
            2 => decode_length_delimited(bytes, cursor, depth)?,
            5 => decode_fixed32(bytes, cursor)?,
            other => {
                return Err(HyperspannerError::MalformedProtobuf {
                    offset: start,
                    detail: format!(
                        "unsupported wire type {other} for field {field_number}"
                    ),
                });
            }
        };
        cursor += consumed;

        fields.push(WireField {
            field: field_number,
            wire_type,
            wire_type_label: wire_type_label(wire_type),
            value,
        });
    }
    Ok(fields)
}

fn wire_type_label(wt: u8) -> &'static str {
    match wt {
        0 => "varint",
        1 => "64-bit",
        2 => "length-delimited",
        5 => "32-bit",
        _ => "unknown",
    }
}

/// Read a base-128 varint starting at `offset`. Returns `(value, bytes_used)`.
fn read_varint(bytes: &[u8], offset: usize) -> HyperspannerResult<(u64, usize)> {
    let mut value: u64 = 0;
    let mut shift = 0u32;
    let mut i = offset;
    loop {
        if i >= bytes.len() {
            return Err(HyperspannerError::MalformedProtobuf {
                offset,
                detail: "varint runs off the end of the buffer".into(),
            });
        }
        let byte = bytes[i];
        i += 1;
        // Spec caps varints at 10 bytes (64 bits + slack); any more is a
        // malformed payload.
        if shift >= 64 {
            return Err(HyperspannerError::MalformedProtobuf {
                offset,
                detail: "varint overflows 64 bits".into(),
            });
        }
        value |= u64::from(byte & 0x7F) << shift;
        if byte & 0x80 == 0 {
            return Ok((value, i - offset));
        }
        shift += 7;
    }
}

fn decode_varint_value(
    bytes: &[u8],
    offset: usize,
) -> HyperspannerResult<(WireValue, usize)> {
    let (uint, used) = read_varint(bytes, offset)?;
    Ok((
        WireValue::Varint {
            uint: uint.to_string(),
            int: (uint as i64).to_string(),
        },
        used,
    ))
}

fn decode_fixed32(bytes: &[u8], offset: usize) -> HyperspannerResult<(WireValue, usize)> {
    if bytes.len() < offset + 4 {
        return Err(HyperspannerError::MalformedProtobuf {
            offset,
            detail: "fixed32 truncated".into(),
        });
    }
    let raw = [
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
    ];
    let uint = u32::from_le_bytes(raw);
    let int = i32::from_le_bytes(raw);
    let float = f32::from_le_bytes(raw);
    Ok((WireValue::Fixed32 { uint, int, float }, 4))
}

fn decode_fixed64(bytes: &[u8], offset: usize) -> HyperspannerResult<(WireValue, usize)> {
    if bytes.len() < offset + 8 {
        return Err(HyperspannerError::MalformedProtobuf {
            offset,
            detail: "fixed64 truncated".into(),
        });
    }
    let raw: [u8; 8] = bytes[offset..offset + 8]
        .try_into()
        .expect("slice is exactly 8 bytes");
    let uint = u64::from_le_bytes(raw);
    let int = i64::from_le_bytes(raw);
    let float = f64::from_le_bytes(raw);
    Ok((
        WireValue::Fixed64 {
            uint: uint.to_string(),
            int: int.to_string(),
            float,
        },
        8,
    ))
}

fn decode_length_delimited(
    bytes: &[u8],
    offset: usize,
    depth: u32,
) -> HyperspannerResult<(WireValue, usize)> {
    let (len, used) = read_varint(bytes, offset)?;
    let len = len as usize;
    let start = offset + used;
    if bytes.len() < start + len {
        return Err(HyperspannerError::MalformedProtobuf {
            offset,
            detail: "length-delimited field runs off the end of the buffer".into(),
        });
    }
    let payload = &bytes[start..start + len];
    let total_used = used + len;

    // Speculative interpretation order: nested message → utf-8 string →
    // raw bytes. We only commit to "nested message" if the WHOLE payload
    // parses cleanly (no leftover bytes). Same for utf-8 — must be valid
    // utf-8 and contain at least some printable content.
    if depth < MAX_NESTED_DEPTH {
        if let Ok(nested) = decode_message(payload, depth + 1) {
            if !nested.is_empty() {
                return Ok((WireValue::Message { fields: nested }, total_used));
            }
        }
    }

    if let Ok(s) = std::str::from_utf8(payload) {
        if is_likely_text(s) {
            return Ok((
                WireValue::String {
                    value: s.to_string(),
                },
                total_used,
            ));
        }
    }

    Ok((
        WireValue::Bytes {
            hex: hex::encode(payload),
            len,
        },
        total_used,
    ))
}

/// Heuristic: is this string "probably" intended as text? At least one
/// printable char and no control chars other than whitespace. Empty
/// strings are excluded (an empty length-delimited field is shown as
/// bytes with len=0 — clearer for the user).
fn is_likely_text(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }
    let mut printable = 0usize;
    for c in s.chars() {
        if c.is_control() && c != '\n' && c != '\r' && c != '\t' {
            return false;
        }
        if !c.is_whitespace() {
            printable += 1;
        }
    }
    printable > 0
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: decode a hex string and return the field list, panicking on
    /// the unhappy path so test bodies stay terse.
    fn decode(hex_input: &str) -> Vec<WireField> {
        decode_protobuf(hex_input.to_string()).expect("decode succeeds")
    }

    #[test]
    fn empty_input_yields_empty_field_list() {
        let r = decode("");
        assert!(r.is_empty());
    }

    #[test]
    fn varint_field() {
        // tag = (1 << 3) | 0 = 0x08; value 150 = varint 0x96 0x01
        let r = decode("089601");
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].field, 1);
        assert_eq!(r[0].wire_type, 0);
        match &r[0].value {
            WireValue::Varint { uint, int } => {
                assert_eq!(uint, "150");
                assert_eq!(int, "150");
            }
            v => panic!("unexpected value: {v:?}"),
        }
    }

    #[test]
    fn varint_negative_two_complement() {
        // Field 1, varint, all-ones (10 bytes) = u64::MAX. As signed, -1.
        let r = decode("08FFFFFFFFFFFFFFFFFF01");
        assert_eq!(r.len(), 1);
        match &r[0].value {
            WireValue::Varint { uint, int } => {
                assert_eq!(uint, "18446744073709551615");
                assert_eq!(int, "-1");
            }
            v => panic!("unexpected value: {v:?}"),
        }
    }

    #[test]
    fn length_delimited_string() {
        // Field 2, wire 2, len 5, "hello"
        // tag = (2 << 3) | 2 = 0x12
        let r = decode("120568656c6c6f");
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].field, 2);
        assert_eq!(r[0].wire_type, 2);
        match &r[0].value {
            WireValue::String { value } => assert_eq!(value, "hello"),
            v => panic!("expected string; got {v:?}"),
        }
    }

    #[test]
    fn length_delimited_nested_message() {
        // Outer: field 3, wire 2, len 4
        // Inner: field 1, varint, value 7
        //        field 2, varint, value 8
        // tag inner: 0x08 0x07 0x10 0x08  (4 bytes)
        // tag outer: (3 << 3) | 2 = 0x1A
        let r = decode("1A0408071008");
        assert_eq!(r.len(), 1);
        match &r[0].value {
            WireValue::Message { fields } => {
                assert_eq!(fields.len(), 2);
                assert_eq!(fields[0].field, 1);
                assert_eq!(fields[1].field, 2);
            }
            v => panic!("expected nested message; got {v:?}"),
        }
    }

    #[test]
    fn length_delimited_raw_bytes_falls_through() {
        // Field 4, wire 2, len 3, bytes 0xff 0xfe 0xfd (not valid utf-8, not a
        // valid nested protobuf). Should fall through to Bytes.
        let r = decode("2203FFFEFD");
        assert_eq!(r.len(), 1);
        match &r[0].value {
            WireValue::Bytes { hex, len } => {
                assert_eq!(hex, "fffefd");
                assert_eq!(*len, 3);
            }
            v => panic!("expected bytes; got {v:?}"),
        }
    }

    #[test]
    fn fixed32_decodes_three_views() {
        // Field 5, wire 5, value 1.5 as little-endian float32 = 0x00 0x00 0xC0 0x3F
        let r = decode("2D 0000C03F");
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].field, 5);
        assert_eq!(r[0].wire_type, 5);
        match &r[0].value {
            WireValue::Fixed32 { float, .. } => {
                assert!((*float - 1.5).abs() < f32::EPSILON);
            }
            v => panic!("expected fixed32; got {v:?}"),
        }
    }

    #[test]
    fn fixed64_decodes_three_views() {
        // Field 6, wire 1 (64-bit), value 0x0102030405060708 little-endian
        let r = decode("31 0807060504030201");
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].field, 6);
        assert_eq!(r[0].wire_type, 1);
        match &r[0].value {
            WireValue::Fixed64 { uint, .. } => {
                // 0x0102030405060708 = 72623859790382856
                assert_eq!(uint, "72623859790382856");
            }
            v => panic!("expected fixed64; got {v:?}"),
        }
    }

    #[test]
    fn invalid_hex_returns_error() {
        let err = decode_protobuf("zz".into()).unwrap_err();
        assert_eq!(err.kind(), "invalid_hex");
    }

    #[test]
    fn truncated_varint_returns_error() {
        // 0x80 is "varint continues" — but the buffer ends.
        let err = decode_protobuf("0880".into()).unwrap_err();
        assert_eq!(err.kind(), "malformed_protobuf");
    }

    #[test]
    fn unsupported_wire_type_returns_error() {
        // Wire type 3 (start-group) is rejected.
        // tag = (1 << 3) | 3 = 0x0B
        let err = decode_protobuf("0B".into()).unwrap_err();
        assert_eq!(err.kind(), "malformed_protobuf");
    }

    #[test]
    fn hex_input_strips_whitespace_and_prefix() {
        // Same as varint_field but with formatting noise
        let r = decode("0x08 96 01");
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].field, 1);
    }
}
