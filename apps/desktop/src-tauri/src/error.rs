//! IPC-safe error taxonomy.
//!
//! Every command in `crate::commands` returns `HyperspannerResult<T>`, which
//! serializes across the Tauri IPC boundary as a tagged object:
//!
//!   { "kind": "path_not_found", "message": "path does not exist: /tmp/foo" }
//!
//! The TS side (apps/desktop/src/ipc/errors.ts) mirrors this shape as a
//! `HyperspannerError` class so callers can pattern-match on `.kind`
//! without string-parsing the message. New variants MUST be added on both
//! sides in the same commit — the union in errors.ts is the contract.
//!
//! Design choices:
//!   - Variants are intentionally coarse-grained. We want the TS layer to
//!     make UX decisions (e.g. "path not found" => show a clear notice,
//!     "file too large" => offer to truncate) without needing to understand
//!     OS errno codes. std::io::Error details collapse into `Io`.
//!   - `message` is human-readable; `kind` is machine-readable. UI code
//!     consults `kind` first and falls back to `message` for display.

use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum HyperspannerError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("path does not exist: {path}")]
    PathNotFound { path: String },

    #[error("path is not a file: {path}")]
    NotAFile { path: String },

    #[error("file too large: {size} bytes exceeds limit of {limit} bytes")]
    FileTooLarge { size: u64, limit: u64 },

    #[error("unsupported encoding: {encoding}")]
    InvalidEncoding { encoding: String },

    #[error("file contains invalid UTF-8 starting at byte {offset}")]
    InvalidUtf8 { offset: usize },

    #[error("unsupported hash algorithm: {algorithm}")]
    UnsupportedAlgorithm { algorithm: String },
}

impl HyperspannerError {
    /// Machine-readable tag. Stable across the IPC boundary — do not rename
    /// without updating `apps/desktop/src/ipc/errors.ts`.
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Io(_) => "io",
            Self::PathNotFound { .. } => "path_not_found",
            Self::NotAFile { .. } => "not_a_file",
            Self::FileTooLarge { .. } => "file_too_large",
            Self::InvalidEncoding { .. } => "invalid_encoding",
            Self::InvalidUtf8 { .. } => "invalid_utf8",
            Self::UnsupportedAlgorithm { .. } => "unsupported_algorithm",
        }
    }
}

impl Serialize for HyperspannerError {
    /// Serialize as `{ "kind": "...", "message": "..." }`.
    ///
    /// We hand-roll this instead of deriving(Serialize) because the derived
    /// form would emit an enum-variant shape (`{"NotAFile": {"path": "..."}}`)
    /// that's awkward to consume from TS without a deserialize step. A flat
    /// `{ kind, message }` keeps the TS side to a two-field switch.
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = s.serialize_map(Some(2))?;
        map.serialize_entry("kind", self.kind())?;
        map.serialize_entry("message", &self.to_string())?;
        map.end()
    }
}

pub type HyperspannerResult<T> = Result<T, HyperspannerError>;
