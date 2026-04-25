//! Hash computation commands.
//!
//! Phase 6.4 introduces cryptographic hashing over text and files. Two commands
//! let the frontend compute digests for the Hash Workbench without re-implementing
//! hash logic in every caller:
//!
//!   - `hash_text(text, algorithm) -> HashResult`
//!     Hashes a UTF-8 string in memory. Supported algorithms: md5, sha1, sha256,
//!     sha512 (canonical lowercase names). Accepts various input spellings:
//!     "SHA-256", "Sha256", "sha_256" all normalize to "sha256" and produce the
//!     same digest.
//!
//!   - `hash_file(path, algorithm, max_bytes?) -> HashResult`
//!     Hashes a file's contents up to an optional byte limit (default 64 MiB).
//!     Reuses the `stat_and_check` pattern from `fs.rs` to validate the path
//!     exists, is a file, and respects the size ceiling. Returns the digest,
//!     canonical algorithm name, and bytes hashed.
//!
//! Algorithm normalization design: we normalize input (`"SHA-256"` → `"sha256"`)
//! internally but preserve the original user input in error messages so the UI
//! can echo back exactly what the user typed when rejecting an unknown algo.
//! The response's `algorithm` field is the canonical (lowercase, no separators)
//! form so the frontend doesn't need to track normalization rules.
//!
//! Implementation note: The four RustCrypto hash crates (md-5, sha1, sha2) each
//! export a `Digest` trait and algorithm-specific hasher types. We dispatch on
//! the normalized algorithm string and construct the appropriate hasher per-algo
//! to keep digest computation clean and isolated.
//!
//! Size limit design: `hash_file` defaults to 64 MiB (`HASH_DEFAULT_MAX_BYTES`)
//! to match the `fs` module's default. We define this constant locally so the
//! hash module can evolve its ceiling independently (e.g., raise to 1 GB later)
//! without coupling to fs.rs's constraints.

use std::fs;
use std::path::Path;

use serde::Serialize;

use crate::error::{HyperspannerError, HyperspannerResult};

/// Default ceiling for a single hash operation. 64 MiB is the Phase 6.4 default;
/// the Hash Workbench can pass its own override for larger files.
pub const HASH_DEFAULT_MAX_BYTES: u64 = 64 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HashResult {
    /// Hex-encoded digest. Lowercase, no "0x" prefix, no separators.
    pub digest: String,
    /// Canonical algorithm name (lowercase, no separators). Echoed back so the
    /// frontend doesn't need to normalize before using the result.
    pub algorithm: String,
    /// Number of bytes hashed. For `hash_text`, this is the UTF-8 byte count
    /// of the input string (not the character count). For `hash_file`, this is
    /// the file size (which was pre-checked against the max_bytes limit).
    pub size: u64,
}

/// Normalize an algorithm name. Lowercases the input, strips hyphens and
/// underscores, and returns the canonical form for matching (e.g., "SHA-256"
/// becomes "sha256", "sha_512" becomes "sha512", etc.).
fn normalize_algorithm(input: &str) -> String {
    input.to_ascii_lowercase().replace('-', "").replace('_', "")
}

/// Compute the hash digest of a byte slice using the specified algorithm.
/// The algorithm string must be in canonical form (lowercased, no separators).
/// Returns the hex-encoded digest or an UnsupportedAlgorithm error if the
/// algorithm is not recognized.
fn digest_of(bytes: &[u8], algo: &str) -> HyperspannerResult<String> {
    match algo {
        "md5" => {
            use md5::Digest as _;
            let mut h = md5::Md5::new();
            h.update(bytes);
            Ok(hex::encode(h.finalize()))
        }
        "sha1" => {
            use sha1::Digest as _;
            let mut h = sha1::Sha1::new();
            h.update(bytes);
            Ok(hex::encode(h.finalize()))
        }
        "sha256" => {
            use sha2::Digest as _;
            let mut h = sha2::Sha256::new();
            h.update(bytes);
            Ok(hex::encode(h.finalize()))
        }
        "sha512" => {
            use sha2::Digest as _;
            let mut h = sha2::Sha512::new();
            h.update(bytes);
            Ok(hex::encode(h.finalize()))
        }
        other => Err(HyperspannerError::UnsupportedAlgorithm {
            algorithm: other.to_string(),
        }),
    }
}

#[tauri::command]
pub fn hash_text(text: String, algorithm: String) -> HyperspannerResult<HashResult> {
    let normalized = normalize_algorithm(&algorithm);
    // Check the algorithm before computing the digest to fail fast on unknown algos.
    let _ = digest_of(b"", &normalized)
        .map_err(|_| HyperspannerError::UnsupportedAlgorithm {
            algorithm: algorithm.clone(),
        })?;

    let digest = digest_of(text.as_bytes(), &normalized).map_err(|e| match e {
        HyperspannerError::UnsupportedAlgorithm { .. } => HyperspannerError::UnsupportedAlgorithm {
            algorithm: algorithm.clone(),
        },
        other => other,
    })?;

    // String::len() returns UTF-8 byte count, which is what we want to report
    // to the UI (it's what was actually hashed). This is different from the
    // character count; e.g., "héllo" is 5 chars but 6 UTF-8 bytes.
    let size = text.len() as u64;

    Ok(HashResult {
        digest,
        algorithm: normalized,
        size,
    })
}

/// Check that the path exists and is a regular file, and that its size does
/// not exceed the supplied limit. Returns the size in bytes on success.
/// This is a local copy of the pattern from `fs.rs` to keep `hash.rs` self-contained.
fn stat_and_check(path: &Path, max_bytes: u64) -> HyperspannerResult<u64> {
    let meta = match fs::metadata(path) {
        Ok(m) => m,
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
pub fn hash_file(
    path: String,
    algorithm: String,
    max_bytes: Option<u64>,
) -> HyperspannerResult<HashResult> {
    let normalized = normalize_algorithm(&algorithm);
    // Validate the algorithm before reading the file. This prevents a huge
    // read from being triggered by a typo in the algorithm name.
    let _ = digest_of(b"", &normalized)
        .map_err(|_| HyperspannerError::UnsupportedAlgorithm {
            algorithm: algorithm.clone(),
        })?;

    let limit = max_bytes.unwrap_or(HASH_DEFAULT_MAX_BYTES);
    let p = Path::new(&path);
    let size = stat_and_check(p, limit)?;
    let bytes = fs::read(p)?;

    let digest = digest_of(&bytes, &normalized).map_err(|e| match e {
        HyperspannerError::UnsupportedAlgorithm { .. } => HyperspannerError::UnsupportedAlgorithm {
            algorithm: algorithm.clone(),
        },
        other => other,
    })?;

    Ok(HashResult {
        digest,
        algorithm: normalized,
        size,
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
    fn hash_text_md5_known_vector() {
        let result = hash_text("".to_string(), "md5".to_string()).expect("ok");
        assert_eq!(result.digest, "d41d8cd98f00b204e9800998ecf8427e");
        assert_eq!(result.algorithm, "md5");
        assert_eq!(result.size, 0);
    }

    #[test]
    fn hash_text_sha1_known_vector() {
        let result = hash_text("abc".to_string(), "sha1".to_string()).expect("ok");
        assert_eq!(result.digest, "a9993e364706816aba3e25717850c26c9cd0d89d");
        assert_eq!(result.algorithm, "sha1");
        assert_eq!(result.size, 3);
    }

    #[test]
    fn hash_text_sha256_known_vector() {
        let result = hash_text("abc".to_string(), "sha256".to_string()).expect("ok");
        assert_eq!(result.digest, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assert_eq!(result.algorithm, "sha256");
        assert_eq!(result.size, 3);
    }

    #[test]
    fn hash_text_sha512_known_vector() {
        let result = hash_text("abc".to_string(), "sha512".to_string()).expect("ok");
        assert_eq!(
            result.digest,
            "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f"
        );
        assert_eq!(result.algorithm, "sha512");
        assert_eq!(result.size, 3);
    }

    #[test]
    fn hash_text_accepts_dashed_and_cased_names() {
        // All three spellings should produce the same digest and echo back the canonical form.
        let result1 = hash_text("test".to_string(), "SHA-256".to_string()).expect("ok");
        let result2 = hash_text("test".to_string(), "Sha256".to_string()).expect("ok");
        let result3 = hash_text("test".to_string(), "sha_256".to_string()).expect("ok");

        assert_eq!(result1.digest, result2.digest);
        assert_eq!(result2.digest, result3.digest);
        assert_eq!(result1.algorithm, "sha256");
        assert_eq!(result2.algorithm, "sha256");
        assert_eq!(result3.algorithm, "sha256");
    }

    #[test]
    fn hash_text_rejects_unknown_algorithm() {
        let err = hash_text("data".to_string(), "crc32".to_string()).expect_err("should fail");
        assert_eq!(err.kind(), "unsupported_algorithm");
        // The error message should contain the original input, not the normalized form.
        let msg = err.to_string();
        assert!(msg.contains("crc32"), "error message should contain original input");
    }

    #[test]
    fn hash_text_size_matches_utf8_bytes() {
        // "héllo" is 5 characters but 6 UTF-8 bytes (è is 2 bytes).
        let result = hash_text("héllo".to_string(), "sha256".to_string()).expect("ok");
        assert_eq!(result.size, 6);
    }

    #[test]
    fn hash_file_hashes_small_file() {
        let f = write_temp(b"hello world");
        let result = hash_file(
            f.path().to_str().unwrap().to_string(),
            "sha256".to_string(),
            None,
        )
        .expect("ok");
        assert_eq!(
            result.digest,
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
        assert_eq!(result.algorithm, "sha256");
        assert_eq!(result.size, 11);
    }

    #[test]
    fn hash_file_rejects_missing_path() {
        let err = hash_file(
            "/does/not/exist/hyperspanner-test".to_string(),
            "sha256".to_string(),
            None,
        )
        .expect_err("should fail");
        assert_eq!(err.kind(), "path_not_found");
    }

    #[test]
    fn hash_file_rejects_directory() {
        let dir = std::env::temp_dir();
        let err = hash_file(
            dir.to_str().unwrap().to_string(),
            "sha256".to_string(),
            None,
        )
        .expect_err("should fail");
        assert_eq!(err.kind(), "not_a_file");
    }

    #[test]
    fn hash_file_honors_max_bytes() {
        let f = write_temp(b"1234567890");
        let err = hash_file(
            f.path().to_str().unwrap().to_string(),
            "sha256".to_string(),
            Some(5),
        )
        .expect_err("should fail");
        assert_eq!(err.kind(), "file_too_large");
    }

    #[test]
    fn hash_file_rejects_unknown_algorithm() {
        let f = write_temp(b"data");
        // Algorithm validation happens BEFORE file reading, so a bogus algo
        // on a 4 GB file won't trigger a huge read.
        let err = hash_file(
            f.path().to_str().unwrap().to_string(),
            "crc32".to_string(),
            None,
        )
        .expect_err("should fail");
        assert_eq!(err.kind(), "unsupported_algorithm");
    }
}
