---
type: plan
project: "Hyperspanner"
status: active
version: 5
updated: 2026-04-24
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
  2026-04-23: backend-first, then all 13 tools). Sub-phases 6.0 and 6.1 both
  verified on Windows host 2026-04-24 (cargo test + pnpm test/typecheck/build
  green after four small fixes logged in the Errors table below):
  - **6.0 Backend command surface + scaffolding** (verified 2026-04-24) —
    Rust layer: `HyperspannerError` enum
    (thiserror + flat `{ kind, message }` serde transport) at `src-tauri/src/error.rs`;
    `commands::fs::{read_file_bytes, read_text_file}` at `src-tauri/src/commands/fs.rs`
    with seven unit tests (`tempfile` dev-dep); both commands registered in
    `src-tauri/src/lib.rs`. TS layer: `apps/desktop/src/ipc/` with `errors.ts`
    (typed `HyperspannerError` class + `toHyperspannerError` normalizer),
    `invoke.ts` (lazy-imported transport with a test seam), `fs.ts` (typed
    wrappers), `index.ts` (barrel), `ipc.test.ts` (twelve Vitest cases). Explicitly
    DEFERRED to their owning sub-phase: `hash_bytes` (→6.4), `decode_protobuf` (→6.5),
    `tls_inspect` (→6.5). Reason logged as lesson #49 — resist designing a command
    surface against imagined requirements; land each command with its consumer.
  - **6.1 JSON Validator vertical slice + tool-pattern doc** (verified
    2026-04-24) — shipped
    `apps/desktop/src/tools/json-validator/` (pure `lib.ts` with `validateJson` /
    `formatJson` / `minifyJson` / offset<->line-col conversion; `JsonValidator.tsx`
    on top of the shared `ToolFrame`; `JsonValidator.module.css`; 20+ lib tests
    under node env + 7 component tests under jsdom). Shared tool scaffolding landed
    at `apps/desktop/src/tools/components/` (`ToolFrame` zone-responsive chrome;
    `ToolStatusPill` with four semantic states). Registry entry for `json-validator`
    now points at the real component. Tool pattern codified in
    `docs/tool-pattern.md` — the five rules (component-vs-lib split, discriminated-
    union errors, `useTool` for state, zone-responsive layout, IPC-only OS access)
    set the template for the remaining twelve tools.
  - **6.2 Text + data tools (no backend)** (verified 2026-04-24) — seven
    tools landed on the tool-pattern (each a single folder under
    `apps/desktop/src/tools/<id>/` with pure `lib.ts` + `useTool` state +
    shared `ToolFrame` chrome + discriminated-union results + both lib
    and component tests): `case-transform`, `whitespace-clean`, `base64-pad`,
    `url-codec`, `cidr-calc`, `regex-tester`, `yaml-validator`. Registry
    flipped each from `PlaceholderTool` to the real component; `yaml-validator`
    gained `supportedZones: ['center', 'bottom']` because pretty-printed YAML
    is tall. Added `js-yaml ^4.1.0` + `@types/js-yaml ^4.0.9`. Gates green on
    Windows host: typecheck clean, 234 tests passing (80 pre-existing + 154
    new), build clean. Small follow-up: RegexTester's flag toggles use
    inline styled buttons instead of LcarsPill — off-grammar but functionally
    correct, punt to polish. Lessons #56 (shape lockdown via reference-impl
    reads) and #57 (parallel-fanout build orchestration contract) captured
    the working approach for 6.3–6.5.
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
| 2026-04-23 | Phase 6.0 backend ships `fs` commands only; `hash_bytes`/`decode_protobuf`/`tls_inspect` deferred to their owning sub-phases | Avoid designing against imagined consumer requirements; avoid dragging in `prost-reflect`/`rustls`/RustCrypto crates before any code uses them (lesson #49) |
| 2026-04-23 | Rust→TS error transport is a flat `{ kind, message }` shape (hand-rolled Serialize) rather than serde's externally-tagged enum | TS side gets a discriminated string-literal union to switch on instead of having to deserialize variant-keyed objects (lesson #47) |
| 2026-04-23 | TS IPC transport uses a lazy dynamic import with a `__setInvokeForTests` seam instead of a top-level `@tauri-apps/api` import | Vitest in jsdom doesn't ship the Tauri runtime; a seam keeps tests runnable without global module mocks while production builds still tree-shake (lesson #48) |
| 2026-04-24 | Phase 6.2 used a parallel-fanout build approach: read the JSON-Validator reference impl in full, brief N subagents on the same pattern, enforce exclusive ownership of package.json and registry at the parent | One pattern pass shipped seven tools on the first try with zero registry churn and zero test-harness regressions; generalizes to 6.3–6.5 unchanged (lessons #56, #57) |

## Errors Encountered
| Date | Error | Resolution |
|------|-------|------------|
| 2026-04-20 | Tauri dev build failed: `icons/icon.ico not found; required for generating a Windows Resource file during tauri-build` | Generated multi-resolution ICO (16/24/32/48/64/128/256) + ICNS + PNGs via Python/Pillow. On Windows, `tauri-build` runs a resource generator unconditionally — icons are required even in dev. |
| 2026-04-20 | `packages.metadata does not exist` warning during `cargo tauri dev` | Harmless; legacy Cargo.toml section Tauri 2 no longer uses. Ignored. |
| 2026-04-20 | Linux sandbox can't follow pnpm node_modules symlinks (I/O error) | Typecheck verification must run on Windows host; bash sandbox is only useful for non-node tooling. |
| 2026-04-23 | `pnpm build` failed during Phase 4/5 verification: esbuild error "Transforming destructuring to the configured target environment ('safari14' + 2 overrides) is not supported yet" on ThemeContext (99 errors total, all parameter destructuring / arrow patterns). | Switched `apps/desktop/vite.config.ts` `build.target` from browser-specific (`chrome105`/`safari14`) to syntax-level `es2020`. esbuild's Safari compat table has a recurring false-positive pattern where it flags destructuring as "needs transpilation" but can't transpile it; we'd hit the same bug on safari13 previously. ES-syntax target sidesteps the browser table entirely. Logged as lesson #46. |
| 2026-04-24 | `cargo test -p hyperspanner` failed: `FileBytes` / `FileText` don't implement `Debug`, which blocks `.expect_err("should fail")` on `Result<FileBytes, _>` at five test sites in `commands/fs.rs`. | Added `#[derive(Debug, Serialize)]` on both structs. Logged as lesson #50 — serde payload structs should always derive `Debug` + `Serialize` together; `.expect_err` / `.unwrap_err` on any `Result<ThisStruct, _>` requires it and the cost is zero. |
| 2026-04-24 | `pnpm --filter @hyperspanner/desktop test` failed: 7 of the 22 `lib.test.ts` cases errored on Node 22 V8. Root cause: newer V8 changed the `JSON.parse` error-message format mid-version — `Unexpected token '}', "{"a":}" is not valid JSON` carries no `position N` or `line X column Y` info, so the normalizer's two regex branches both missed it and returned null offset/line/column. | Added two more probes to `normalizeParseError`: (a) extract the offending character from `Unexpected token 'X'` and recover offset via `text.indexOf(char)`; (b) `Unexpected end of JSON input` → position at `text.length`. Tightened the `cleanMessage` suffix regex to strip V8's source-quote fragment regardless of nested quotes or literal `...` ellipsis prefixes. Logged as lesson #51. |
| 2026-04-24 | `pnpm --filter @hyperspanner/desktop test` failed: 6 of the 7 `JsonValidator.test.tsx` cases errored with `Found multiple elements with the text of: JSON input buffer`. Root cause: `@testing-library/react`'s `render()` appends to `document.body` and doesn't auto-clean up under Vitest without `@testing-library/jest-dom` wired up; previous tests' DOM trees leaked into subsequent tests. | Imported `cleanup` from `@testing-library/react` and called it in the `afterEach` hook alongside `clearToolState`. Logged as lesson #52. Rule captured in `docs/tool-pattern.md` §6 as a component-test invariant every Phase 6 tool has to honor. |
| 2026-04-24 | `pnpm --filter @hyperspanner/desktop typecheck` failed with 2 errors in `ipc.test.ts`: (a) `InvokeFn` is generic `<T>(...) => Promise<T>`, can't be satisfied by a concrete `async () => 'pong'` arrow; (b) `err` from `.catch((e) => e)` on `invoke('X')` is `unknown`, so `err.kind` fails TS2345 even though `expect(err).toBeInstanceOf(HyperspannerError)` above runs fine. | (a) cast the test fake through `unknown` to `InvokeFn`, with a type-only `import type { InvokeFn }`; (b) wrap the `.kind` access in an `if (err instanceof HyperspannerError)` narrowing block — the preceding `toBeInstanceOf` assertion still guards runtime, so the `if` is purely a compile-time device. Logged as lesson #53. |
