---
type: plan
project: "Hyperspanner"
status: active
version: 3
updated: 2026-04-23
phases:
  - id: 0
    name: "Bootstrap (Tauri + React + Vite + pnpm workspace)"
    status: complete
  - id: 1
    name: "Design tokens + lcars-ui primitive package"
    status: complete
  - id: 2
    name: "App shell and zone layout"
    status: complete
  - id: 3
    name: "Workspace state (Zustand) + persistence"
    status: complete
  - id: 4
    name: "Tool registry + navigator"
    status: complete
  - id: 5
    name: "Command palette"
    status: complete
  - id: 6
    name: "Vertical-slice tools + backend commands"
    status: in_progress
  - id: 7
    name: "Presets + persistence"
    status: pending
  - id: 8
    name: "Settings + about"
    status: pending
  - id: 9
    name: "Polish (motion, sound, a11y)"
    status: pending
  - id: 10
    name: "Rust backend hardening"
    status: pending
  - id: 11
    name: "Testing / packaging / first release"
    status: pending
current_phase: 6
---

# Plan: Hyperspanner

## Goal
Ship a Tauri-based developer utility suite styled as a Starfleet engineering console
(LCARS-24.2 design grammar, picard-modern muted productivity variant). The detailed
phased plan lives in `docs/plan-002-implementation.md`.

## Active variant
`picard-modern` — charcoal `#0a0a0f`, muted salmon `#d88463`, dusty purple `#8a7aa8`,
sand text `#eae4d6`. Three other variants (`classic`, `nemesis-blue`, `lower-decks`)
ship for theme switching. Defined in `apps/desktop/src/themes/`.

## Phase status at a glance
- **Phase 0 complete** — pnpm monorepo, Tauri 2 + Vite 7 + React 19 wired, Antonio font,
  ThemeContext injecting CSS vars, icon set generated, dev build launches.
- **Phase 1 complete** — `@hyperspanner/lcars-ui` package published with 13 primitives
  plus tokens. `/primitive-gallery` route renders every primitive with a theme switcher.
  See `status.md` for the current review gate.
- **Phase 2 complete** — AppShell with TopRail, LeftNavigator and Center/Right/Bottom
  dock zones; hash-based `#/gallery` route; no floating windows.
- **Phase 3 complete** — Zustand `useWorkspaceStore` with openTool / closeTool / moveTool /
  splitCenter / mergeCenter / setActive / toggleZone / applyPreset / resetLayout;
  single-instance focus with pulse; `useTool<T>` per-tool runtime slot; ZoneTabStrip +
  TabActionMenu wired through AppShell; Vitest + @testing-library/react unit tests.
- **Phase 4 complete** — `useFavorites` + `useRecents` (Zustand + persist middleware, MRU
  ordered, capped); LeftNavigator rebuilt with search + PINNED + RECENT + Browse sections;
  TabActionMenu gains Pin/Unpin toggle; HomeView launchpad (pinned + recent + browse card
  grid) replaces the placeholder empty-state in CenterZone; every openTool path feeds
  recents.
- **Phase 5 complete** — `CommandPalette` (Cmd+K, portaled modal, scored filter, tools +
  actions); `keys/` module with `useGlobalShortcuts` (per-binding `whenTyping` policy),
  `ShortcutHelp` overlay (Shift+?), and a `Shortcut` / `formatShortcut` helper set. All
  shortcut callers flow through the registry; zone toggles still composed via
  `useShellShortcuts`.
- **Phase 6 in progress** — decomposed into six sub-phases (user-approved scope on
  2026-04-23: backend-first, then all 13 tools):
  - **6.0 Backend command surface + scaffolding** (implementation landed 2026-04-23,
    awaiting Windows-host verification) — Rust layer: `HyperspannerError` enum
    (thiserror + flat `{ kind, message }` serde transport) at `src-tauri/src/error.rs`;
    `commands::fs::{read_file_bytes, read_text_file}` at `src-tauri/src/commands/fs.rs`
    with seven unit tests (`tempfile` dev-dep); both commands registered in
    `src-tauri/src/lib.rs`. TS layer: `apps/desktop/src/ipc/` with `errors.ts`
    (typed `HyperspannerError` class + `toHyperspannerError` normalizer),
    `invoke.ts` (lazy-imported transport with a test seam), `fs.ts` (typed
    wrappers), `index.ts` (barrel), `ipc.test.ts` (twelve Vitest cases). Explicitly
    DEFERRED to their owning sub-phase: `hash_bytes` (→6.4), `decode_protobuf` (→6.5),
    `tls_inspect` (→6.5). Reason logged as lesson #42 — resist designing a command
    surface against imagined requirements; land each command with its consumer.
  - **6.1 JSON Validator vertical slice + tool-pattern doc** — first real tool on top
    of the scaffolding. Establishes the tool-component shape so the remaining 12 land
    on rails. Pure in-browser (no backend), but built using `useTool` + the IPC wrappers
    so future tools can swap in Tauri invokes without structural changes.
  - **6.2 Text + data tools (no backend)** — Case Transform, Whitespace Clean, Base64
    Pad, URL Codec, CIDR Calc, Regex Tester, YAML Validator (js-yaml). ~7 tools.
  - **6.3 Text Diff** — separate sub-phase because of the two-pane layout work and
    diff-library evaluation (jsdiff vs diff-match-patch).
  - **6.4 Binary + hashing** — Hash Workbench (SubtleCrypto for small inputs, backend
    `hash_bytes` + filesystem read for large files), Hex Inspector (filesystem read +
    offset-navigated hex+ASCII viewer). Adds `hash_bytes` to the backend.
  - **6.5 Network + protocol** — Protobuf Decode (prost-reflect), TLS Inspector
    (rustls). Adds `decode_protobuf` and `tls_inspect` commands. Most involved Rust.
  - **6 verification** — full typecheck+test+build + visual spot-check of every tool,
    flip `current_phase` to 7.

## Decisions Made
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-20 | Default theme is `picard-modern` (not classic) | plan-001 §"Color usage" calls for muted productivity palette; classic reads as cosplay |
| 2026-04-20 | Primitives decoupled from `useTheme`/`useSound` | Library must be framework-pure; host app wires hooks via props |
| 2026-04-20 | Data-viz primitives (Table, Sparkline, Gauge, Chart, DataCascade) deferred to Phase 6 | Their consumers (tools) don't land until Phase 6 — avoid building against imagined requirements |
| 2026-04-20 | Semantic role → token mapping lives in `tokens/index.ts` | Variants remap per theme without touching primitives |
| 2026-04-23 | Phase 6.0 backend ships `fs` commands only; `hash_bytes`/`decode_protobuf`/`tls_inspect` deferred to their owning sub-phases | Avoid designing against imagined consumer requirements; avoid dragging in `prost-reflect`/`rustls`/RustCrypto crates before any code uses them (lesson #42) |
| 2026-04-23 | Rust→TS error transport is a flat `{ kind, message }` shape (hand-rolled Serialize) rather than serde's externally-tagged enum | TS side gets a discriminated string-literal union to switch on instead of having to deserialize variant-keyed objects (lesson #40) |
| 2026-04-23 | TS IPC transport uses a lazy dynamic import with a `__setInvokeForTests` seam instead of a top-level `@tauri-apps/api` import | Vitest in jsdom doesn't ship the Tauri runtime; a seam keeps tests runnable without global module mocks while production builds still tree-shake (lesson #41) |

## Errors Encountered
| Date | Error | Resolution |
|------|-------|------------|
| 2026-04-20 | Tauri dev build failed: `icons/icon.ico not found; required for generating a Windows Resource file during tauri-build` | Generated multi-resolution ICO (16/24/32/48/64/128/256) + ICNS + PNGs via Python/Pillow. On Windows, `tauri-build` runs a resource generator unconditionally — icons are required even in dev. |
| 2026-04-20 | `packages.metadata does not exist` warning during `cargo tauri dev` | Harmless; legacy Cargo.toml section Tauri 2 no longer uses. Ignored. |
| 2026-04-20 | Linux sandbox can't follow pnpm node_modules symlinks (I/O error) | Typecheck verification must run on Windows host; bash sandbox is only useful for non-node tooling. |
| 2026-04-23 | `pnpm build` failed during Phase 4/5 verification: esbuild error "Transforming destructuring to the configured target environment ('safari14' + 2 overrides) is not supported yet" on ThemeContext (99 errors total, all parameter destructuring / arrow patterns). | Switched `apps/desktop/vite.config.ts` `build.target` from browser-specific (`chrome105`/`safari14`) to syntax-level `es2020`. esbuild's Safari compat table has a recurring false-positive pattern where it flags destructuring as "needs transpilation" but can't transpile it; we'd hit the same bug on safari13 previously. ES-syntax target sidesteps the browser table entirely. Logged as lesson #46. |
