//! Tauri command surface.
//!
//! Each submodule groups related IPC commands. Commands return
//! `HyperspannerResult<T>` (see `crate::error`) so failures cross the IPC
//! boundary as a `{ kind, message }` object the TS layer can pattern-match on.
//!
//! Phase 6.0 ships `fs` only. Future sub-phases add modules alongside:
//!   - 6.4: `hash` (hash_bytes)
//!   - 6.5: `protobuf` (decode_protobuf), `tls` (tls_inspect)
//!
//! New commands MUST be wired into `tauri::generate_handler![]` in `lib.rs`,
//! and a typed binding MUST be added under `apps/desktop/src/ipc/`. The
//! command name (snake_case on Rust, camelCase on TS) is the IPC contract.

pub mod fs;
pub mod hash;
