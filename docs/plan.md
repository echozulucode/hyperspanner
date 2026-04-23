---
type: plan
project: "Hyperspanner"
status: active
version: 1
updated: 2026-04-22
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
    status: pending
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
- **Phase 6 next** — replace placeholder tools with real vertical-slice implementations
  (JSON Validator, Diff, Base64, JWT Inspector, etc.) and wire the first Tauri backend
  commands they depend on (filesystem read, text transform).

## Decisions Made
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-20 | Default theme is `picard-modern` (not classic) | plan-001 §"Color usage" calls for muted productivity palette; classic reads as cosplay |
| 2026-04-20 | Primitives decoupled from `useTheme`/`useSound` | Library must be framework-pure; host app wires hooks via props |
| 2026-04-20 | Data-viz primitives (Table, Sparkline, Gauge, Chart, DataCascade) deferred to Phase 6 | Their consumers (tools) don't land until Phase 6 — avoid building against imagined requirements |
| 2026-04-20 | Semantic role → token mapping lives in `tokens/index.ts` | Variants remap per theme without touching primitives |

## Errors Encountered
| Date | Error | Resolution |
|------|-------|------------|
| 2026-04-20 | Tauri dev build failed: `icons/icon.ico not found; required for generating a Windows Resource file during tauri-build` | Generated multi-resolution ICO (16/24/32/48/64/128/256) + ICNS + PNGs via Python/Pillow. On Windows, `tauri-build` runs a resource generator unconditionally — icons are required even in dev. |
| 2026-04-20 | `packages.metadata does not exist` warning during `cargo tauri dev` | Harmless; legacy Cargo.toml section Tauri 2 no longer uses. Ignored. |
| 2026-04-20 | Linux sandbox can't follow pnpm node_modules symlinks (I/O error) | Typecheck verification must run on Windows host; bash sandbox is only useful for non-node tooling. |
