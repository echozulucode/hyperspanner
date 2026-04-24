//! Filesystem read commands.
//!
//! Phase 6.0 minimum viable surface: two commands that let the frontend pull
//! file contents into a tool without re-implementing path checks and size
//! limits in every caller.
//!
//!   - `read_file_bytes(path, max_bytes?) -> FileBytes`
//!     Raw bytes for binary tools (Hex Inspector, Hash Workbench, Protobuf
//!     Decode). Returns the full `Vec<u8>` plus size + path.
//!
//!   - `read_text_file(path, encoding?, max_bytes?) -> FileText`
//!     UTF-8-validated string for text tools (JSON/YAML Validator, Text Diff).
//!     Rejects invalid UTF-8 with `InvalidUtf8 { offset }` so the UI can point
//!     at the exact byte. Phase 6.0 supports "utf-8" only; other encodings
//!     return `InvalidEncoding`. We add `encoding_rs` when a tool actually
//!     needs Latin-1 / UTF-16 — premature otherwise.
//!
//! Size limit design: we default to 64 MiB. Each command accepts an optional
//! `max_bytes` override so a tool like Hash Workbench (which can reasonably
//! handle 1 GB) can raise the ceiling without a separate command. Checking
//! size *before* reading avoids a memory spike on huge files — the order is:
//! stat → size check → read.
//!
//! IPC transport note: `Vec<u8>` serializes as a JSON array of numbers, which
//! is ~5x overhead per byte. Acceptable at Phase 6.0 scale (scaffolding) but
//! likely the first optimization target in 6.4 when Hash Workbench starts
//! feeding large files across the boundary. Candidates: base64 string payload
//! or Tauri's native byte-response channel. Not worth plumbing yet.

use std::fs;
use std::path::Path;

use serde::Serialize;

use crate::error::{HyperspannerError, HyperspannerResult};

/// Default ceiling for a single read. 64 MiB fits comfortably in memory on
/// every target platform and is enough for every Phase 6 tool except the
/// hash workbench (which passes its own override).
pub const DEFAULT_MAX_BYTES: u64 = 64 * 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileBytes {
    /// File contents. See transport note in module docs re: JSON overhead.
    pub bytes: Vec<u8>,
    pub size: u64,
    pub path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileText {
    pub text: String,
    pub size: u64,
    pub path: String,
    /// The encoding that was used to decode. Always "utf-8" in Phase 6.0.
    /// Echoed back so the TS layer doesn't need to track what it asked for.
    pub encoding: String,
}

/// Check that the path exists and is a regular file, and that its size does
/// not exceed the supplied limit. Returns the size in bytes on success.
///
/// We fold the checks into one helper so both commands produce identical
/// error kinds for the same failure modes — makes the TS UX layer simpler
/// (one switch handles both commands' errors).
fn stat_and_check(path: &Path, max_bytes: u64) -> HyperspannerResult<u64> {
    let meta = match fs::metadata(path) {
        Ok(m) => m,
        // Surface "not found" explicitly. std::io::Error has ErrorKind::NotFound
        // but the default `Io` variant wouldn't tell the UI to show a clear
        // "file doesn't exist" notice vs. a generic "io error".
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Err(HyperspannerError::PathNotFound {
                path: path.display().to_string(),
            });
        }
        Err(e) => return Err(HyperspannerError::Io(e)),
    };

    if !meta.is_file() {
        return Err(HyperspannerError::NotAFile {
            path: path.display().to_string(),
        });
    }

    let size = meta.len();
    if size > max_bytes {
        return Err(HyperspannerError::FileTooLarge {
            size,
            limit: max_bytes,
        });
    }

    Ok(size)
}

#[tauri::command]
pub fn read_file_bytes(
    path: String,
    max_bytes: Option<u64>,
) -> HyperspannerResult<FileBytes> {
    let limit = max_bytes.unwrap_or(DEFAULT_MAX_BYTES);
    let p = Path::new(&path);
    let size = stat_and_check(p, limit)?;
    let bytes = fs::read(p)?;
    Ok(FileBytes {
        bytes,
        size,
        path,
    })
}

#[tauri::command]
pub fn read_text_file(
    path: String,
    encoding: Option<String>,
    max_bytes: Option<u64>,
) -> HyperspannerResult<FileText> {
    // Normalize the encoding name — "utf-8", "UTF-8", "utf8" all mean the
    // same thing to a user. Reject anything else with a clear error kind
    // rather than silently substituting utf-8.
    let requested = encoding.as_deref().unwrap_or("utf-8");
    let normalized = requested.to_ascii_lowercase().replace('_', "-");
    let canonical = match normalized.as_str() {
        "utf-8" | "utf8" => "utf-8",
        other => {
            return Err(HyperspannerError::InvalidEncoding {
                encoding: other.to_string(),
            });
        }
    };

    let limit = max_bytes.unwrap_or(DEFAULT_MAX_BYTES);
    let p = Path::new(&path);
    let size = stat_and_check(p, limit)?;
    let raw = fs::read(p)?;

    // std::str::from_utf8 gives us the byte offset of the first invalid
    // sequence for free. Pass it to the UI so the user can jump to the
    // exact byte that broke decoding — much better than "invalid utf-8
    // somewhere in this 40 MB file".
    let text = match std::str::from_utf8(&raw) {
        Ok(s) => s.to_string(),
        Err(e) => {
            return Err(HyperspannerError::InvalidUtf8 {
                offset: e.valid_up_to(),
            });
        }
    };

    Ok(FileText {
        text,
        size,
        path,
        encoding: canonical.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn write_temp(content: &[u8]) -> NamedTempFile {
        let mut f = NamedTempFile::new().expect("create tempfile");
        f.write_all(content).expect("write tempfile");
        f.flush().expect("flush tempfile");
        f
    }

    #[test]
    fn read_file_bytes_returns_contents_and_size() {
        let f = write_temp(b"hello world");
        let path = f.path().to_str().unwrap().to_string();
        let out = read_file_bytes(path.clone(), None).expect("ok");
        assert_eq!(out.bytes, b"hello world");
        assert_eq!(out.size, 11);
        assert_eq!(out.path, path);
    }

    #[test]
    fn read_file_bytes_rejects_missing_path() {
        let err = read_file_bytes("/does/not/exist/hyperspanner-test".into(), None)
            .expect_err("should fail");
        assert_eq!(err.kind(), "path_not_found");
    }

    #[test]
    fn read_file_bytes_rejects_directory() {
        let dir = std::env::temp_dir();
        let err = read_file_bytes(dir.to_str().unwrap().into(), None)
            .expect_err("should fail");
        assert_eq!(err.kind(), "not_a_file");
    }

    #[test]
    fn read_file_bytes_honors_max_bytes() {
        let f = write_temp(b"1234567890");
        let err = read_file_bytes(f.path().to_str().unwrap().into(), Some(5))
            .expect_err("should fail");
        assert_eq!(err.kind(), "file_too_large");
    }

    #[test]
    fn read_text_file_decodes_utf8() {
        let f = write_temp("héllo 🚀".as_bytes());
        let out = read_text_file(f.path().to_str().unwrap().into(), None, None).expect("ok");
        assert_eq!(out.text, "héllo 🚀");
        assert_eq!(out.encoding, "utf-8");
    }

    #[test]
    fn read_text_file_accepts_common_utf8_spellings() {
        let f = write_temp(b"ok");
        for enc in ["utf-8", "UTF-8", "utf8", "UTF8"] {
            let out = read_text_file(
                f.path().to_str().unwrap().into(),
                Some(enc.into()),
                None,
            )
            .expect("ok");
            assert_eq!(out.encoding, "utf-8");
        }
    }

    #[test]
    fn read_text_file_rejects_unknown_encoding() {
        let f = write_temp(b"ok");
        let err = read_text_file(
            f.path().to_str().unwrap().into(),
            Some("latin-1".into()),
            None,
        )
        .expect_err("should fail");
        assert_eq!(err.kind(), "invalid_encoding");
    }

    #[test]
    fn read_text_file_reports_invalid_utf8_offset() {
        // "ab" + a stray 0xFF byte → invalid UTF-8 starting at offset 2.
        let f = write_temp(&[b'a', b'b', 0xFF]);
        let err = read_text_file(f.path().to_str().unwrap().into(), None, None)
            .expect_err("should fail");
        assert_eq!(err.kind(), "invalid_utf8");
        if let HyperspannerError::InvalidUtf8 { offset } = err {
            assert_eq!(offset, 2);
        } else {
            panic!("expected InvalidUtf8 variant");
        }
    }
}
