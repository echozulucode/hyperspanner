//! Hyperspanner Tauri runtime.
//!
//! Phase 6.0: backend command surface scaffolding. The `commands` module
//! groups IPC-exposed functions by concern (fs today; hash/protobuf/tls land
//! in later 6.x sub-phases). Every command returns `HyperspannerResult<T>`
//! so errors cross the IPC boundary as a `{ kind, message }` object.
//!
//! Keep this file tiny: its job is to wire the subsystem, not host logic.
//! When adding a new command:
//!   1. Implement it under `commands/<module>.rs` with `#[tauri::command]`.
//!   2. Re-export (or expose via `pub use`) as needed.
//!   3. Register it below in `tauri::generate_handler![]`.
//!   4. Add a typed TS binding under `apps/desktop/src/ipc/`.
//!
//! The `invoke_handler` list is the public IPC contract — deleting or
//! renaming an entry is a breaking change the TS side must pick up in the
//! same commit.

pub mod commands;
pub mod error;

use tracing::info;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

#[tauri::command]
fn ping() -> &'static str {
    "pong"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(fmt::layer())
        .init();

    info!("hyperspanner starting");

    // Install rustls's default crypto provider once at startup. Required by
    // rustls 0.23 — the first ClientConfig builder call panics otherwise.
    let _ = rustls::crypto::ring::default_provider().install_default();

    tauri::Builder::default()
        // Phase 7 plugins. The updater plugin pings the manifest URL
        // configured in `tauri.conf.json` (plugins.updater.endpoints)
        // and verifies signatures against the bundled minisign public
        // key. The process plugin pairs with it for the post-install
        // `relaunch()` call from the JS side. Both must be registered
        // BEFORE `invoke_handler` because plugin initializers expose
        // their commands through the same routing layer.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            commands::fs::read_file_bytes,
            commands::fs::read_text_file,
            commands::hash::hash_text,
            commands::hash::hash_file,
            commands::protobuf::decode_protobuf,
            commands::tls::tls_inspect,
        ])
        .run(tauri::generate_context!())
        .expect("error while running hyperspanner");
}
