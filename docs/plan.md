---
type: plan
project: "Hyperspanner"
status: active
version: 20
updated: 2026-04-27
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
    status: complete
  - id: 7
    name: "Presets + persistence"
    status: complete
  - id: 8
    name: "Settings + about"
    status: in_progress
  - id: 9
    name: "Polish (motion, sound, a11y)"
    status: pending
  - id: 10
    name: "Rust backend hardening"
    status: pending
  - id: 11
    name: "Testing / packaging / first release"
    status: pending
current_phase: 8
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
- **Phase 6 COMPLETE (verified 2026-04-25)** — all 14 tools shipped with real
  implementations; verification gate passed: `cargo test -p hyperspanner` clean,
  `pnpm --filter @hyperspanner/desktop test` clean (599 passing), `pnpm typecheck`
  clean (after a final 4-error sweep adding `title?: string` to `LcarsPill`),
  `pnpm build` clean. The closing-out test sweep across 2026-04-25 fixed ~14
  behavioral bugs across the suite — see `status.md` for the per-tool detail.
  Decomposed into seven sub-phases (user-approved scope on 2026-04-23:
  backend-first, then all 13 tools; 6.6 Number Converter added 2026-04-24 as a
  14th tool):
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
  - **6.3 Text Diff** (verified 2026-04-24 — user ran `pnpm install`;
    dev-server smoke still a user-side pass but not gating forward
    progress) — shipped
    `apps/desktop/src/tools/text-diff/` on the tool-pattern (pure `lib.ts` with
    `diffTexts` returning a `{kind: 'ok' | 'empty'}` discriminated union + line-level
    hunks + word-level inline spans on modified lines, `byteLength` helper; `TextDiff.tsx`
    with `{left, right, mode: 'edit' | 'view'}` state via `useTool`; edit mode = two
    textareas, view mode = two-column rendered diff with line-number gutter, change
    markers, and inline word spans; action cluster View↔Edit, Swap (hidden in compact),
    Sample↔Clear; zone-responsive — compact variant flips `grid-template-columns` to
    `grid-template-rows`, first tool exercising this as a genuine layout swap rather
    than a density knob; 24 lib tests + 12 component tests). Registry entry flipped
    from `PlaceholderTool` → `TextDiff`, kept `supportedZones: ['center', 'bottom']`
    with a rationale comment. Added `diff ^7.0.0` + `@types/diff ^7.0.2`; chose jsdiff
    over diff-match-patch for three reasons: direct `diffLines` + `diffWordsWithSpace`
    APIs that compose cleanly for side-by-side rendering, ~30KB vs ~140KB bundle,
    well-typed via `@types/diff`. Verification gate held: same `pnpm install` blocker
    as 6.2's `js-yaml` (lesson #58) — dev-server cold start needs to pick up the new
    deps before smoke-testing.
  - **6.4 Binary + hashing** (code landed 2026-04-24; TS sweep
    done, re-verification pending — `cargo test -p hyperspanner`
    green; `pnpm typecheck` surfaced 22 errors across 11 files
    which were swept in place: unused-variable strictness
    (14 sites), a bigint `>>>` mistake in cidr-calc (`>>>` isn't
    on BigInt; removed the redundant coerce), `toHaveTextContent`
    in HashWorkbench.test.tsx (this repo uses plain vitest
    matchers — rewrote to `textContent.toContain`), the
    `InvokeFn` generic-cast pattern (lesson #53) not applied by
    the subagent (five sites fixed with `as unknown as InvokeFn`),
    a `RegexCompileError | RegexCompileEmpty` narrowing mis-use
    in regex-tester/lib.ts, and a functional-updater shape bug
    in HexInspector (returned Partial instead of full state).
    Re-running `pnpm typecheck && test && build` is the next
    gate.) — shipped Hash Workbench + Hex Inspector on the tool-pattern, plus
    the backing Rust surface. Backend: new `commands/hash.rs` with
    `hash_text(text, algorithm)` and `hash_file(path, algorithm,
    max_bytes?)` (canonical names md5/sha1/sha256/sha512 with
    dash/case/underscore normalization), new `UnsupportedAlgorithm`
    variant on `HyperspannerError`, four RustCrypto deps (`md-5`,
    `sha1`, `sha2`, `hex`). 12 unit tests on `hash::tests`. TS:
    `ipc/hash.ts` wrapper + `'unsupported_algorithm'` threaded into
    the error union, four new ipc.test.ts cases. Hash Workbench
    computes all four digests simultaneously (text mode debounces
    250ms; file mode uses a path input + Compute pill — no file
    dialog plugin yet, MVP scope), 14 lib + 12 component tests.
    Hex Inspector renders a 16-byte-wide hex+ASCII dump, paginated
    in 64-row (1 KiB) windows so even a gigabyte file only mounts a
    single page of DOM; locked to `supportedZones: ['center']` since
    the 16-byte layout is non-negotiable. 22 lib + 11 component tests.
    Deviation from Phase 6.0's `hash_bytes` nomenclature: we split
    into `hash_text` + `hash_file` to avoid the JSON-array-of-numbers
    IPC tax on text input and to keep large-file reads Rust-side.
    One subagent ownership crossing surfaced (lesson #59 — fanout
    briefing needs to name shared-file owners explicitly).
  - **6.5 Network + protocol** (code landed 2026-04-24; verification
    pending host-side `cargo test` + `pnpm typecheck/test/build`) —
    shipped Protobuf Decode + TLS Inspector as MVPs. Protobuf Decode
    is schema-less: parses raw wire bytes via varint + tag math
    (no `protox`/`prost-reflect` dep) and renders the field tree;
    speculative recursion for nested messages, fall-through to
    UTF-8 string / hex bytes for non-message length-delimited fields.
    TLS Inspector connects via `rustls 0.23` + `tokio-rustls` +
    `webpki-roots`, parses certs with `x509-parser`, and falls back
    to a permissive verifier when the strict pass rejects (so
    self-signed / expired chains still surface with `trusted: false`).
    Both Rust commands have unit tests. Six new error variants
    (`malformed_protobuf`, `invalid_hex`, `network_error`,
    `tls_handshake_failed`, `certificate_parse_failed`,
    `invalid_endpoint`). Both tool folders follow the standard
    six-file pattern. Registry entries flipped from PlaceholderTool
    to the real components.
  - **6.6 Number Converter** (code landed 2026-04-24; verification
    pending host-side `pnpm typecheck && test && build`) —
    single-pane bidirectional value/hex editor with
    a binary read-out, modeled on the classic embedded-engineer "base
    converter" but rebuilt with modern type vocabulary. Two top-row dropdowns
    (`Endianness`: big/little — replaces the legacy Motorola/Intel labels;
    `Type`: uint8/int8/uint16/int16/uint32/int32/uint64/int64/float32/float64
    — replaces byte/short/long, includes 64-bit which the original lacked).
    Below: two synced editable fields (`Hex` ↔ `Decimal`) that round-trip
    losslessly through a Uint8Array stored in `useTool` state — editing
    either field re-derives the other; changing endianness reinterprets the
    bytes; changing type adjusts the byte width and preserves as much value
    as fits. A read-only `Binary` row underneath shows the bit pattern with
    nibble-grouped underscores for legibility (`0001_0010 0011_0100`).
    No Rust backend — JS DataView + BigInt handle every conversion in-process,
    including float32/float64 IEEE-754 round-trips and the >`Number.MAX_SAFE_INTEGER`
    cases. Validation: hex input rejects non-hex chars (allows `0x` prefix
    and whitespace), decimal input enforces the chosen type's signed/unsigned
    range, both surface a `ToolStatusPill error` on out-of-range input.
    `defaultZone: 'center'`, no `supportedZones` restriction (the layout is
    narrow enough to fit any zone — text, hex, decimal, binary all stack).
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
| 2026-04-24 | Phase 6.4 splits the 6.0-planned `hash_bytes` command into `hash_text` + `hash_file` | `Vec<u8>` serializes as a JSON-array-of-numbers over Tauri IPC (~5× byte overhead — documented caveat from Phase 6.0's `read_file_bytes`). Text input already lives as a `String` on both sides, so `hash_text` sends it without encoding. File input we let Rust read locally, so bytes never cross IPC at all. Raw-bytes hashing (pre-computed binary blobs from TS) has no consumer in Phase 6 — resist building it until something needs it (lesson #49) |
| 2026-04-24 | Hash Workbench routes all four algorithms through the Rust backend instead of using SubtleCrypto for SHA-* in the browser | SubtleCrypto doesn't support MD5 (W3C deprecated it for security uses), so a SubtleCrypto path would require per-algorithm branching. At Phase 6.4 scale (text inputs typically <1 MB), the Rust round-trip adds ~1-2 ms of IPC latency — imperceptible in the UI — and the code stays single-path. Re-measure if we ever add a "hash this 4 GB blob" use case |
| 2026-04-24 | Protobuf Decode is schema-less for Phase 6.5 (no `.proto` schema input, no `protox`/`prost-reflect` deps) | Schema-driven decoding requires the user to supply a `.proto` text and a fully-qualified message type name — that's a lot of UX surface for an MVP, plus pulling protox compiles a whole protobuf grammar parser into the Rust binary. Schema-less wire-format decoding works on every payload identically; the user pastes hex bytes and gets a tree of field-numbers + wire-typed values. The Rust side speculatively recurses on length-delimited fields to surface nested messages, falling back to UTF-8 strings or raw bytes. If a future revision wants schema-driven decoding (with semantically-named field labels), that's a second command — keep this one focused |
| 2026-04-24 | TLS Inspector falls back to a permissive verifier when the standard webpki-roots one rejects a chain | The tool's job is to *show* what a server presents — refusing to surface anything when the chain doesn't verify is the wrong default. Self-signed dev/lab certs, expired prod certs, and internal CAs are all things a developer routinely needs to inspect. Strict pass first; on cert-verification failure (recognized via error-message heuristic), retry with a permissive verifier and flag `trusted: false` so the UI can surface the distinction. Network-level failures (timeout, refused, etc.) bypass the fallback and surface as-is — no point retrying a connect failure with different cert rules |
| 2026-04-24 | After UX-3.6 fixed Case Transform's wrapping action cluster, normalize the rule across the suite: every tool's action-row pills are `size="small"` regardless of zone | The `medium` variant compounds vertical footprint when wrap kicks in, which is the failure mode for any zone narrower than ~800px. Two-pill clusters lose ~24px of pill height under this rule, but suite-wide consistency in compact mode is worth more than slightly larger pills in center. The `medium` variant remains available for hero pills (e.g., the LeftNavigator's category tiles); just not for tool action toolbars |
| 2026-04-24 | Add Number Converter tool as new sub-phase 6.6 (was not in the original 13-tool list) | User remembered a useful "base converter" from a prior tool they had — bidirectional hex ↔ value editor with a binary read-out, byte-order toggle, and data-type dropdown. Slotting it in before the Phase 6 verification gate is cheaper than carrying it as Phase 7+ scope. No Rust required — DataView and BigInt cover every conversion. Doesn't logically belong in 6.5 (which is already two heavy network/protocol tools); separate sub-phase keeps the fanout briefs clean |
| 2026-04-24 | Number Converter uses "Big Endian" / "Little Endian" instead of the original "Motorola" / "Intel" labels; uses `uint8`/`int16`/`float32` instead of `byte`/`short`/`float (32)`; includes 64-bit signed and unsigned (was absent in the original) | Motorola/Intel are pre-1990s vendor names that read as historical jargon to anyone not steeped in embedded firmware; Big/Little Endian are the standard terms in C/C++ standards, network-byte-order discussions, and language stdlib docs. `byte/short/long` carry per-language-different sizes (Java's long is 64-bit, C's is platform-dependent); the `uintN`/`intN`/`floatN` form maps unambiguously to the underlying byte layout and matches Rust, Go, TypeScript-numeric, protobuf, MessagePack. 64-bit types are now ubiquitous (Unix timestamps in microseconds, snowflake IDs, large monetary integers) and JS BigInt makes them trivial to support |
| 2026-04-24 | Drop "Raw Hex" from the Number Converter's byte-order options (was the third option alongside Motorola/Intel in the original) | "Raw Hex" isn't an endianness — it's an identity transform on display. Mixing it into the byte-order dropdown conflates two orthogonal concepts (how bytes are laid out vs. how bytes are presented). The modernized design surfaces hex as its own row that always shows bytes in the order the user typed them; endianness only governs how those bytes are interpreted when computing the decimal value and the binary readout for multi-byte types |
| 2026-04-24 | Inspector (right zone) is single-tool — no tab strip, dragging a new tool in evicts the existing one | Two tabs in a 280-px-wide inspector were already cramped and rarely useful in practice; the inspector's role is "one piece of context next to the main workspace", not a parallel tab system. Single-tool semantics let the tab strip go away entirely (saved ~52px of vertical room) and surface the close affordance as a small × button in the zone header. Eviction does a full `clearToolState` so the next tool starts fresh — the previous tool's buffer doesn't linger in memory under a hidden id |
| 2026-04-24 | ToolFrame eyebrow drops the zone prefix (`CENTER · NUMBER-CONVERTER` → `NUMBER-CONVERTER`) and the larger orange title hides entirely in compact docks | The zone is already obvious from where the tool is rendered, and the title was the third place the same name appeared (tab, eyebrow, body header). In compact docks where every pixel matters, dropping the title saves ~32px of header chrome and the eyebrow alone keeps the tool identifiable. In full (center) docks the title still renders so the panel reads as a deliberate workspace rather than a stripped utility |
| 2026-04-24 | In compact docks the body subtitle moves to a hover ⓘ icon next to the eyebrow | The full descriptive subtitle is useful onboarding context but uses ~24px of header height that's hard to spare in the inspector. The ⓘ icon next to the eyebrow surfaces the same text via the native `title` attribute — discoverable, accessible, no popover library, zero vertical cost when not hovered |

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
| 2026-04-24 | After UX-3 landed (single-tool inspector + tab-strip removal + tighter compact density), user reported that drop overlays sometimes stayed visible after a successful drag-and-drop into the inspector. Root cause: HTML5 `dragend` is dispatched on the original drag-source DOM node. When a tab is moved out of its zone, the `PulsingTab` source unmounts before `dragend` reaches the bubble path to window — the event fires on a detached node and our window-level listener never sees it, leaving `dragActive` stuck `true` on every `PaneDropTarget`. | Added a `mouseup` window listener to `PaneDropTarget` as a watchdog: HTML5 drag suppresses pointer events during the drag, so `mouseup` only fires after the user actually releases the pointer (drop or cancel) — making it a safe last-resort cleanup that always runs even when `dragend` is skipped. The existing `dragend` + `drop` window listeners stay; `mouseup` is purely defensive. |
| 2026-04-24 | After UX-3.2 removed the empty `ZoneTabStrip` banner from the center zone, the user reported HomeView's first row of tool cards was still half-visible at the top of the launchpad even when scrolled all the way up. Root cause: `CenterZone.module.css`'s `.contentEmpty` class applies `align-items: center; justify-content: center; padding: 1.25rem` to `.content` when no tools are docked. With HomeView taller than `.content`, flexbox centering positions HomeView with a NEGATIVE top offset (relative to the scroll container). That offset is unreachable by scrolling — flex centering happens in layout space, not scroll space — so the top portion of HomeView is permanently clipped at the scroll origin. This is a known CSS gotcha distinct from `align-items: flex-start` overflow behavior. | Stop applying `.contentEmpty` in the CenterZone single-pane no-tools case; use the default `.content` (`align-items: stretch`). HomeView's `.root` already has its own `overflow-y: auto`, so internal scrolling is preserved while the rendering origin starts at the top of `.content`. The split-pane empty case still uses `.contentEmpty` because there it correctly centers a tiny "SIDE A · EMPTY" badge. | 
| 2026-04-24 | UX-3.1's `mouseup` watchdog DIDN'T actually fix the stuck-drop-overlay bug — user reproduced it again with a clean repro: open Number Converter, drag the tab to the inspector, the dashed overlay on center stays visible. Real root cause turned out to be different: `event.stopPropagation()` in `PaneDropTarget`'s React `handleDrop` handler. React's `stopPropagation` on a synthetic event ALSO calls `nativeEvent.stopPropagation()`, which prevents the native `drop` event from bubbling past React's root container to the `window` listener. So even when `drop` fires correctly on the inspector's region div, the cleanup never reaches the center / bottom `PaneDropTarget`s via window. The earlier "dragend-misses-due-to-source-unmount" theory was right in spirit but wasn't the load-bearing bug. | Removed `event.stopPropagation()` from both `handleDragOver` and `handleDrop` (kept `preventDefault`, which is needed for HTML5 drop targets). The native event now bubbles to window normally, which dispatches the cleanup to every `PaneDropTarget`'s `dragstart`/`drop`/`dragend`/`mouseup` listener. The `mouseup` watchdog stays as defense-in-depth. Lesson worth keeping: React's `stopPropagation` is NOT synthetic-only — it punctures down to the underlying native event. Reach for it intentionally only when you actually want to stop native bubbling too. |
| 2026-04-24 | Phase 6.4 `pnpm typecheck` surfaced 22 errors across 11 files after code-landing. Grouped by shape: 14 strict-mode unused-variable sites (base64-pad, case-transform, hash-workbench, hex-inspector, regex-tester, text-diff); `cidr-calc/lib.ts:304` used `(val & 0xffffn) >>> 0` but BigInt doesn't support `>>>`; `HashWorkbench.test.tsx` used `toHaveTextContent` but this repo never wired `@testing-library/jest-dom` (see JsonValidator.test.tsx comment calling this out); 5 sites in `HashWorkbench.test.tsx` passed concrete async arrows to `__setInvokeForTests` where the param type is the generic `InvokeFn` (lesson #53 pattern not applied); `regex-tester/lib.ts:114` accessed `.message` after an `if (kind !== 'ok')` guard that narrowed to `Error | Empty` (only Error has `.message`); `HexInspector.tsx` functional setState updater returned `{ offsetRow: N }` but `useTool`'s functional path requires a full state `T`. | Unused-vars: removed the dead locals/imports and prefixed unused params with `_`. BigInt: removed the redundant `>>> 0` (the `& 0xffffn` already gives a non-negative value). jest-dom matcher: rewrote two sites to plain vitest `expect(el.textContent).toContain(...)`. InvokeFn casts: applied the lesson #53 pattern `((fn) as unknown) as InvokeFn` at all 5 sites. regex-tester narrowing: split into explicit `if (compiled.kind === 'error')` + defensive `if (compiled.kind !== 'ok') return { kind: 'empty' }`. HexInspector: spread `...prev` in both functional updaters so the return shape is a full `HexInspectorState`. Side-benefit: fixing the unused `label` in RegexTester also caught a render bug where `${'{label}'}` was literal text instead of `{label}`. All sites fixed in place; `cargo test` still green, `pnpm typecheck && test && build` re-run pending. |
