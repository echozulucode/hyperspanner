# Plan 002 — Hyperspanner Implementation Plan

Derived from `plan-001-lcars-approach-research.md`. Translates the design direction into a phased build plan for a Tauri 2 + React + TypeScript desktop app: a developer utility suite presented as a Starfleet engineering console.

The reference React app at `reference/lcars-example` is treated as a vendor source for primitives (LcarsBar, LcarsPanel, LcarsBanner, LcarsPill, LcarsChip, LcarsTabs, LcarsTable, LcarsGauge, LcarsSparkline, LcarsChart, LcarsDataCascade) and a small set of theme tokens. The shell, docking model, tool registry, command palette, and Rust backend are built fresh.

The `lcars-interface-designer` skill (vendored at `reference/lcars-example/skills/lcars-interface-designer/`) is the design authority for fidelity questions. It must be invoked at the start of any phase that introduces new visual primitives or screens, with the variant set to `picard-modern` (productivity console, restrained palette) and fidelity `product-adapted`.

---

## 0. Guiding constraints

These constraints apply across every phase and are non-negotiable unless plan-001 is amended.

- **Variant**: `picard-modern` adapted for productivity. Strongest LCARS expression in left rail and segmented framing; interiors stay clean and dense.
- **Docking**: managed zones only — Center, Right, Bottom — with optional 2-way Center split. No floating windows in v1.
- **Single instance per tool**: opening an already-open tool focuses and pulses it.
- **Fixed shell, scrollable content**: shell rails never scroll. Tool interiors scroll inside their zone.
- **Black seams**: 0.25rem black borders between colored regions, per LCARS-24.2.
- **Typography**: Antonio (vendored from reference). All shell labels uppercase with tight tracking; tool interiors in normal sentence case.
- **No third-party chart or layout libraries**. SVG and CSS Modules only, matching the reference.
- **Rust does the work**: parsing, validation, binary conversion, file IO, protocol decode all live behind Tauri commands. The renderer never blocks on heavy work.
- **Accessibility**: keyboard-first. Every action reachable via shortcut. Focus rings preserved despite LCARS chrome.

---

## Phase 0 — Project bootstrap

Goal: get a runnable Tauri shell on disk with the reference assets vendored in, lint and type-check passing, and a single placeholder window.

Deliverables:
- `apps/desktop` Tauri 2 project scaffolded with `cargo create-tauri-app` using the React + TypeScript + Vite template.
- `pnpm` workspace at the repo root with `apps/desktop` and `packages/lcars-ui` (the extracted primitive library).
- ESLint + Prettier + TypeScript strict mode configured to match the reference (`tsconfig.app.json`, `tsconfig.node.json`).
- Antonio fonts and beep sounds copied from `reference/lcars-example/src/assets/` into `apps/desktop/src/assets/`.
- `global.css` ported with `@font-face` declarations and CSS reset.
- `ThemeContext` ported from `reference/lcars-example/src/contexts/ThemeContext.tsx`.
- `themes/classic.ts`, `themes/nemesis-blue.ts`, `themes/lower-decks.ts` ported and a new `themes/picard-modern.ts` derived from classic with muted palette per plan-001 §"Color usage".
- `cargo tauri dev` opens an empty dark window with Antonio loaded and the picard-modern background color visible.
- A `justfile` (or npm scripts) for `dev`, `build`, `lint`, `typecheck`, `test`.

Verification:
- `pnpm typecheck` and `pnpm lint` both clean.
- `cargo tauri dev` launches; document title reads "Hyperspanner".
- Visual check: window is `#0a0a0f` (or the chosen dark charcoal), Antonio renders correctly in a sample `<h1>HYPERSPANNER</h1>`.

Risks:
- Tauri 2 + Vite 7 + React 19 alignment. If incompatible, pin to the reference's React 19.1.1 and Vite 7.1.7 versions.

---

## Phase 1 — Design tokens and the `lcars-ui` primitive package

Goal: extract the reference primitives into a clean, importable package the shell will depend on. Adapt them for the productivity-console variant.

**Invoke `lcars-interface-designer` skill at start of phase** with: variant=`picard-modern`, screen type=`widescreen console`, fidelity=`product-adapted`, stack=React+TS+CSS Modules. Use its output as the design contract for primitives.

Deliverables (in `packages/lcars-ui`):
- `tokens/` — CSS variables and a TS theme object covering: colors (per `picard-modern` palette), spacing (`barHeight`, `seam`, `leftRailWidth`, `radiusTop`, `radiusBottom`, etc.), radii, type scale, motion timings.
- Ported and de-prefixed primitives:
  - `LcarsBar` (segmented bar, the workhorse)
  - `LcarsBanner` (zone title strip with end pill)
  - `LcarsPill` (button-shaped element with anchored label)
  - `LcarsPanel` (rectangular block in the left rail with optional pill cap)
  - `LcarsChip` (status badge: VALID / WARNING / ERROR / IDLE / ACTIVE)
  - `LcarsTabs` (pill nav for in-zone tab switching)
  - `LcarsTable` (sticky-header sortable table)
  - `LcarsDataCascade` (telemetry strip)
  - `LcarsSparkline`, `LcarsGauge`, `LcarsChart` (kept available for future tools, not required by shell)
- New primitives required by plan-001 that are not in the reference:
  - `LcarsRail` — generic vertical or horizontal frame with elbow corner control (so the shell can compose its own layout instead of using the demo-only `LcarsStandardLayout`).
  - `LcarsZoneHeader` — the strip that sits above each zone (Center, Right, Bottom): zone label, current tool title, action menu trigger.
  - `LcarsCommandBar` — top rail composed of segmented bands with action slots.
  - `LcarsSearchField` — LCARS-styled input with pill border for the navigator search and command palette.
  - `LcarsEmptyState` — placeholder inside an empty zone ("AUXILIARY SYSTEMS READY", "OUTPUT CHANNEL IDLE").
  - `LcarsSplitHandle` — drag handle for resizing zones; uses a thin colored bar with a center grip.
  - `LcarsTelemetryLabel` — small label/value pair for status fields.
  - `LcarsStatusChip` — variant of `LcarsChip` with pulsing critical state, already covered if the reference chip is reused.
- Each primitive in its own folder with `Component.tsx`, `Component.module.css`, `index.ts`. Storybook is out of scope; instead, build a single `/primitive-gallery` route in `apps/desktop` that renders each one for visual review.
- Public barrel `packages/lcars-ui/src/index.ts` exporting components and types.

Verification:
- `pnpm --filter lcars-ui build` produces ESM output.
- Primitive gallery route renders every primitive against the picard-modern theme.
- Visual diff against reference primitives: bars and pills are recognizably LCARS (rounded ends, black seams, anchored labels), but palette is muted as plan-001 requires.
- Run the skill's authenticity checklist (layout-grammar.md §"Authenticity checklist") against the gallery screenshot.

---

## Phase 2 — App shell and zone layout

Goal: implement the five-zone shell described in plan-001 §"Core layout" — Top rail, Left navigator, Center, Right, Bottom — using the new primitives. No tools yet; zones render placeholders.

**Re-invoke `lcars-interface-designer` skill** with: screen type=`data-heavy practical dashboard`, ask specifically for the shell composition. Compare its proposed structure against plan-001's zone breakdown and reconcile any conflicts in favor of plan-001.

Deliverables:
- `apps/desktop/src/shell/AppShell.tsx` composing:
  - `<TopRail />` — 36px segmented LCARS band with workspace title, current tool title, layout selector, theme toggle, command palette trigger.
  - `<LeftNavigator />` — fixed 264px column. Top elbow joins it to the top rail. Holds product wordmark, search field, favorites, recents, accordion of categories. Bottom elbow joins it to the baseboard.
  - `<CenterZone />` — primary work surface. Tab strip on top, content below. Supports horizontal or vertical 2-way split.
  - `<RightZone />` — collapsible 320px pane on the right with `LcarsZoneHeader` and content slot.
  - `<BottomZone />` — collapsible 240px pane at the bottom with `LcarsZoneHeader` and content slot.
- CSS Grid layout in `AppShell.module.css`:
  - Areas: `top top top`, `nav center right`, `nav bottom bottom` (when bottom is open).
  - Right and Bottom collapse with CSS transitions on `grid-template-columns` / `grid-template-rows`.
- Reset-layout button in the top rail that returns all zones to their default open/closed state and discards splits.
- Empty-state placeholders in each zone using `LcarsEmptyState`.
- Responsive breakpoints from `theme.breakpoints` — at <=950px, collapse Left to a stub icon column; at <=750px, single-zone mode.

Verification:
- Shell renders at 1920×1080, 1440×900, 1280×800, 1024×768. Elbows render correctly at each size (the reference's lesson: elbows need ~340px host height to render the 160px radius).
- Right and Bottom zones collapse and expand smoothly.
- Reset button restores defaults.
- Keyboard: `Cmd+B` toggles Left, `Cmd+J` toggles Bottom, `Cmd+Shift+E` toggles Right (or platform equivalents).

---

## Phase 3 — Workspace state and managed docking model

Goal: implement the docking rules from plan-001 §"Managed docking model" with a typed state store and the actions enumerated there. No persistence yet; state lives in memory.

Deliverables:
- `apps/desktop/src/state/workspace.ts` using Zustand (preferred for its small size and React 19 compatibility) or a hand-rolled `useReducer` + Context if Zustand is rejected.
- State shape:
  ```ts
  type Zone = 'center' | 'right' | 'bottom';
  type CenterSplit = 'none' | 'horizontal' | 'vertical';
  interface OpenTool {
    id: string;          // tool id from the registry
    zone: Zone;
    splitSide?: 'a' | 'b'; // when zone is center and split != 'none'
  }
  interface WorkspaceState {
    open: OpenTool[];
    activeByZone: Record<Zone, string | null>;
    centerSplit: CenterSplit;
    collapsed: Record<Zone, boolean>;
    layoutPreset: string;
  }
  ```
- Actions: `openTool(id)`, `focusTool(id)`, `closeTool(id)`, `moveTool(id, zone)`, `splitCenter(direction)`, `mergeCenter()`, `setActive(zone, id)`, `toggleZone(zone)`, `applyPreset(name)`, `resetLayout()`.
- Single-instance enforcement: `openTool` checks `open[]` first; if present, switches to `focusTool` semantics and triggers a 500ms pulse on the target tab via a transient `pulseId` field consumed by `LcarsTabs`.
- Default zone resolution: `openTool(id)` consults the tool registry's `defaultZone` if no current zone is forced.
- Zone-aware `<TabStrip>` renders the open tools assigned to that zone, with the "Active" one shown.
- Each tab supports the action menu listed in plan-001: Focus, Move to Center/Right/Bottom, Split Center, Maximize, Return to Default Layout, Close.
- `useTool(id)` hook for tool components to read their own runtime state slot (a separate per-tool state map keyed by id).

Verification:
- Unit tests with Vitest covering: opening duplicates focuses; close removes; move respects split; reset restores defaults; preset application.
- Manual: open three placeholder tools, move them between zones, split the center, verify single-instance pulse.

---

## Phase 4 — Tool registry and navigator

Goal: turn the tool tree into a real, data-driven structure. Build the left navigator and home/launchpad to consume it.

Deliverables:
- `apps/desktop/src/tools/registry.ts` — typed registry. Each entry:
  ```ts
  interface ToolDescriptor {
    id: string;
    name: string;
    category: ToolCategory;
    description: string;
    keywords: string[];
    icon: string;            // token name resolved by an icon map
    defaultZone: Zone;
    layoutHints?: { rightDefault?: boolean; bottomDefault?: boolean };
    component: () => Promise<{ default: React.ComponentType }>; // dynamic import
    backendCommands?: string[]; // names of Tauri commands the tool relies on
  }
  type ToolCategory =
    | 'text'
    | 'validation'
    | 'data'
    | 'binary'
    | 'visualization'
    | 'network'
    | 'configurators'
    | 'utilities';
  ```
- Categories ordered per plan-001 §"Recommended top-level categories".
- A small starter set of registry entries — placeholders are fine; each just renders its name and category. This proves the navigator wiring without building the actual tools yet.
- `LeftNavigator` composition:
  - `LcarsSearchField` at top, debounced filter against `name + keywords + description`.
  - Favorites section, populated from a `useFavorites()` hook backed by `localStorage` for now.
  - Recents section, populated from a `useRecents()` hook capped at 10.
  - Accordion of categories. Each category header is a `LcarsBandHeader`-styled element with item count on the right and chevron rotation.
  - Tree nodes inside categories: tool rows show name, single-letter category color dot, status indicator (open/closed), and an action menu trigger.
  - Active and focused tools highlighted distinctly (active = currently selected; focused = currently visible in any zone).
- `HomeView` (`/home`) — launchpad rendered when no tools are open and no other route is active:
  - "FAVORITE TOOLS" band
  - "RECENT OPERATIONS" band
  - One band per top-level category showing the first 6 tools as `LcarsPill`s
  - "LAYOUT PRESETS" band at the bottom
  - Lean theatrical: stronger color blocks here than in the workspace.

Verification:
- Navigator filter narrows tools as you type. Empty filter shows full tree.
- Click a tool in nav → opens in default zone. Click again → focuses with pulse. Right-click → action menu with "Move to..." entries.
- Home view renders 8 category bands and reflects favorite/recent state immediately when toggled from a tool tab.

---

## Phase 5 — Command palette and keyboard model

Goal: implement the tactical-console overlay from plan-001 §"4. Command palette / quick open overlay" and the global shortcut map. This is called out in plan-001 as one of the highest-value features.

Deliverables:
- `CommandPalette` modal component — centered, dimmed backdrop, segmented LCARS border with a header reading "COMMAND CHANNEL" and a chip showing current scope.
- Trigger: `Cmd+K` (mac) / `Ctrl+K` (win/linux). Esc closes.
- `LcarsSearchField` at top, instant fuzzy filter (lightweight `fuse.js` or hand-rolled scoring) against:
  - All registered tools (verb: OPEN)
  - Currently open tools (verb: FOCUS, MOVE, CLOSE)
  - Layout presets (verb: APPLY)
  - Theme variants (verb: SWITCH)
  - Workspace actions (verb: RESET LAYOUT, TOGGLE RIGHT, TOGGLE BOTTOM)
- Result rows: verb chip on the left, label, secondary info on the right (category for tools, current zone for open tools).
- Selection model: arrow keys move selection, Enter executes, Tab toggles a per-row sub-action menu (e.g. "Move to Right" instead of default "Open").
- Shortcut registry in `apps/desktop/src/keys/` with a JSON map and a help overlay (`Cmd+/`) listing every shortcut grouped by scope.

Verification:
- Open palette, type "json", select "JSON Validator", press Enter — opens it in the default zone.
- Same again, press Tab → choose "Move to Right" → opens it on the right.
- Help overlay lists all shortcuts and matches actual behavior.

---

## Phase 6 — Vertical-slice tools (high-value, prove the shell)

Goal: build a small set of real tools across categories so the shell is exercised end-to-end. Each tool also defines the inner-tool patterns described in plan-001 §"Style notes for tool interiors".

Pick four tools that span the categories and exercise the right and bottom zones:

1. **JSON Validator + Pretty Viewer** (`data` / `validation`)
   - Center: editor on the left, parsed tree on the right (uses center split).
   - Right zone: schema rules, validation profile.
   - Bottom zone: error list with clickable line numbers.
   - Backend Tauri command: `validate_json(text: String) -> ValidationReport`.
2. **Text Cleaner** (`text`)
   - Center: input/output split. Top command strip (CLEAN, NORMALIZE, CONVERT, COPY, EXPORT) using `LcarsPill`.
   - Right zone: rule toggles (smart quotes, em-dashes, line endings, etc.).
   - Bottom zone: transformation log and warnings.
   - Backend: `clean_text(input, options) -> CleanedResult`.
3. **Base Converter** (`binary`)
   - Center: dense engineering-console panel for dec/hex/bin/oct, signed/unsigned, float reinterpretation, endian.
   - Right zone: bit layout and byte grouping.
   - Bottom zone: history.
   - Backend: `convert_base(value, from_base, to_base, options)`.
4. **HTTP Request Builder** (`network`)
   - Center: method, URL, headers, body editors with tabs for each.
   - Right zone: response headers, response status chip.
   - Bottom zone: response body with content-type-aware viewer.
   - Backend: `send_http_request(spec) -> HttpResponse` using `reqwest`.

Each tool follows the inner-tool discipline:
- Top command strip in the center.
- Compact form rows.
- `LcarsChip` for status (`VALID`, `WARNING`, `ERROR`).
- No nested LCARS chrome inside small widgets.

Verification:
- Each tool opens in its default zone, can be split, can be moved between zones, and survives a `resetLayout`.
- Validation tool shows red `ERROR` chip on bad JSON; parsed tree updates in <50ms for a 200KB input.
- Backend commands return within budget (<100ms for 1MB inputs on JSON validate, <20ms for base conversion).

---

## Phase 7 — Layout presets and persistence

Goal: implement the named presets from plan-001 §"Layout presets" and persist workspace state across sessions.

Deliverables:
- Preset definitions:
  - `default`, `text-ops`, `validation`, `binary-inspection`, `minimal-focus`, `diagnostics`.
- Each preset is a function that returns a partial `WorkspaceState`. Applied via `applyPreset(name)`.
- Preset selector in the top rail and in the home view.
- Persistence layer:
  - `workspace.json` saved to Tauri app data dir (`tauri::api::path::app_data_dir`) on debounced state changes.
  - On startup, Rust loads it and exposes via `get_workspace_state` Tauri command. Renderer hydrates the store.
  - User's favorites, recents, theme variant, and last layout are preserved.
- A "Save as preset…" action that writes a custom preset alongside the built-ins.

Verification:
- Apply each built-in preset; layout changes match definitions.
- Restart the app: workspace is restored exactly.
- Save a custom preset, restart, verify it still appears in the selector.

---

## Phase 8 — Settings and About / Diagnostics views

Goal: implement plan-001 §"5. Settings / preferences view" and §"6. About / diagnostics / system status view". These are not tools — they live in the top rail menu and route via a `view` slot in the workspace.

Deliverables:
- `SettingsView` rendered as a special tool with id `system.settings`, default zone `center`, max one instance:
  - Sections (left rail of the view itself, mimicking shell pattern at smaller scale): Appearance, Theme variants, Layout behavior, Default startup tools, Default workspace, Keyboard shortcuts, Data import/export, External integrations, Logging.
  - Each section is a card with `LcarsBandHeader`.
  - Theme switcher previews picard-modern, classic, nemesis-blue, lower-decks live.
- `AboutView` (`system.about`):
  - App version (from `package.json` and `tauri.conf.json`)
  - Tauri and Rust versions (from a `system_info` Tauri command)
  - Storage paths
  - Recent failures (from a small in-memory error log)
  - Telemetry opt-in toggle (default off; no telemetry actually wired in v1)
  - Logs directory link

Verification:
- Open settings, change theme to nemesis-blue, full UI re-themes within one frame without flicker.
- Change keyboard shortcut, restart, change persists.
- About view shows accurate versions.

---

## Phase 9 — Polish: motion, sound, accessibility, empty states

Goal: deliver the "polished engineering console" feel called out in plan-001 §"Final recommended concept". This is the phase that separates a working app from one that feels right.

Deliverables:
- Motion:
  - Tab pulse animation for single-instance focus (400–700ms per plan-001 §"Focus behavior").
  - Smooth zone collapse/expand (200ms ease-out).
  - Tool-move animation: brief flash of the destination zone header.
  - DataCascade telemetry in the top rail using the existing `LcarsDataCascade`.
  - Reduced-motion: respect `prefers-reduced-motion`; replace pulses with one-frame highlight.
- Sound (optional, off by default; toggle in settings):
  - Reuse beep1–4 from the reference for tab open, command palette commit, validation error, layout reset.
- Accessibility:
  - All interactive elements reachable via Tab.
  - Focus rings preserved (use `:focus-visible` with a 2px outline in `theme.colors.almondCreme` so they read against any zone color).
  - ARIA: nav landmarks for left rail and command bar, `role="tablist"` for tab strips, `aria-live="polite"` for the bottom diagnostics zone.
  - Screen-reader labels on icon-only buttons.
  - Color contrast audit: all text vs background ≥ 4.5:1. Run `axe` against each route.
- Empty states tuned per plan-001 §"Empty zones":
  - Center empty: "WORKSPACE READY — OPEN A TOOL FROM THE LEFT NAVIGATOR"
  - Right empty: "AUXILIARY SYSTEMS READY"
  - Bottom empty: "OUTPUT CHANNEL IDLE"
  - Use `LcarsEmptyState` with a subdued color (mauve/gray, never bright).

Verification:
- Manual run-through of every shortcut; nothing gets stuck.
- `axe` report: zero serious or critical issues on each main route.
- Screen-reader pass with NVDA/VoiceOver: nav labels and tool titles announced correctly.

---

## Phase 10 — Rust backend hardening

Goal: lift the Tauri commands introduced in Phase 6 into a real backend module structure that mirrors the UI organization and handles errors uniformly.

Deliverables (in `apps/desktop/src-tauri/src/`):
- `main.rs` — Tauri app setup, command registration, plugin init.
- `tools/` module per category mirroring the registry:
  - `tools/text.rs`
  - `tools/validation.rs`
  - `tools/data.rs`
  - `tools/binary.rs`
  - `tools/network.rs`
- `state/` module: workspace persistence, app data paths, settings.
- `errors.rs` — single `AppError` enum with `serde::Serialize`. Every command returns `Result<T, AppError>`.
- `logging.rs` — `tracing` + `tracing-subscriber` writing to a rotating file in the app log dir, with a Tauri command to read recent entries (powers the About view's "recent failures").
- Cargo features: gate any optional engines (e.g. `protobuf` decode) behind features so the default build stays small.

Verification:
- `cargo test` covers each tool module's pure logic with table-driven tests (≥80% line coverage on the `tools/` directory).
- Bench: 1MB JSON validate <50ms; 100KB text clean <10ms; 1KB hex round-trip <1ms.
- An induced panic in a command surfaces as an `AppError::Internal` to the renderer, not a process crash.

---

## Phase 11 — Testing, packaging, and first internal release

Goal: ship a 0.1.0 internal build and have a repeatable release path.

Deliverables:
- Vitest setup for renderer unit tests (state store, registry filtering, palette scoring).
- Playwright setup for end-to-end smoke tests against `tauri-driver`:
  - Cold start opens the home view in <2s.
  - Open JSON Validator, paste invalid JSON, see error chip and bottom-zone error list.
  - Apply each preset.
  - Restart app, verify state restored.
- GitHub Actions workflow:
  - `lint`, `typecheck`, `vitest`, `cargo test`, `cargo clippy -- -D warnings`.
  - On tag, build macOS (universal), Windows x64, Linux x64 installers via `tauri-action`.
- `CHANGELOG.md` started; `RELEASE.md` documents the tag-and-publish flow.
- 0.1.0 internal alpha tagged.

Verification:
- A clean clone runs `pnpm install && pnpm dev` and gets a working app.
- Tagged release produces three installers; each launches and reaches the home view.

---

## Future phases (not in v1, captured to scope-protect)

These are explicitly out of scope for the initial implementation but recorded here so they don't quietly creep in.

- Floating windows / true multi-monitor.
- Plugin/tool SDK for third-party tools.
- Cloud sync of workspaces and presets.
- Telemetry pipeline.
- Per-tool keyboard shortcut customization.
- Live collaboration on a workspace.
- WebView-based embedding of external tools.

---

## Cross-cutting working method

A few rules that govern how each phase is executed.

**Always start a phase with the skill.** Before introducing new visuals or screens, invoke `lcars-interface-designer` with the variant, screen type, and target stack. Use its design note + authenticity summary as the acceptance criteria for the phase's UI work. The skill's `references/layout-grammar.md` authenticity checklist is the visual gate.

**Vendor, don't fork.** Primitives that already exist in `reference/lcars-example` are copied into `packages/lcars-ui` once and edited there. The reference repo stays read-only. Do not import directly from `reference/` at runtime.

**Shell stays expressive, interiors stay disciplined.** Plan-001 §"Style notes for tool interiors" is the recurring failure mode to avoid: every new tool will be tempted to wrap its widgets in LCARS chrome. The reviewer for tool PRs should reject that and push the chrome up to the zone header.

**Backend boundaries stay clean.** Tauri commands are the only renderer/Rust seam. No `invoke` calls embedded inside primitives. Tools call a thin per-tool service module that wraps `invoke`.

**Single source of truth.** Tool registry, theme tokens, keyboard map, and preset definitions each have exactly one source file. UI surfaces consume them.

---

## Acceptance criteria for v1

The implementation is complete when all of the following hold:

- The home view, workspace shell, settings, and about views render at the four target resolutions with no layout breakage.
- All four vertical-slice tools are functional and can be opened, focused, moved, split, and closed.
- Command palette covers every workspace-level action.
- All built-in layout presets apply correctly and the workspace persists across restarts.
- A first-time user can open a tool, find a category, and apply a preset entirely with the keyboard.
- Lighthouse-equivalent (axe) accessibility audit on each route shows zero serious issues.
- 0.1.0 installer launches successfully on macOS, Windows, and one Linux distribution.

When those hold, plan-002 is complete and plan-003 should pick up the next layer of tools (more validators, more text helpers, the protocol visualizer called out in plan-001 §"Protocol visualizer").
