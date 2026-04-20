//! Hyperspanner Tauri runtime.
//!
//! Phase 0: bootstrap only. Commands, state, and tool modules are added
//! in later phases per `docs/plan-002-implementation.md`.

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

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running hyperspanner");
}
