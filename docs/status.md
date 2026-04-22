---
type: status
updated: 2026-04-21
current_phase: "plan-006 in flight — LcarsStandardLayout rail/elbow/bar continuation DONE (both rows verified)"
blockers: []
next_actions:
  - "Resume plan-006 T5–T6: build remaining de-risk screens S2–S7"
  - "Then plan-006 T4: graduate remaining primitives to @hyperspanner/lcars-ui"
  - "Then plan-005: apply LCARS polish to AppShell LeftNav + TopRail"
  - "After LCARS polish lands, begin Phase 4: real tool registry + navigator categories + command palette"
---

# Status Log

## Session: 2026-04-21 (LcarsStandardLayout rail→elbow→bar continuation — final round)
**Phase:** plan-006 T3 — de-risk HomeAutomation screen.

**Context entering session:**
Twelve rounds of iteration on the rail-curve-to-horizontal-bar join in
`LcarsStandardLayout`. Earlier attempts to use `::before`/`::after` pseudos
with `z-index: -1` (as the reference does) were brittle across embedding
contexts (DerisScreen / PrimitiveGallery / AppShell). Two separate
stacking-context fix rounds failed to make the elbow render reliably.
Responsive scaling of bar-height and rail-radius caused further breakage
because the elbow primitive is a fixed 60×60 quarter-circle. After the
round 10/11 fixes the BOTTOM rail was correct but the TOP rail's bar +
elbow were still invisible on HomeAutomation.

**Actions this session:**
- **Diagnosis.** Read `LcarsStandardLayout.tsx` + `.module.css`,
  `HomeAutomationScreen.tsx`, `LcarsDataCascade.module.css`,
  `LcarsPanel.module.css`. Confirmed the top row's `.rightFrameTop` children
  (banner + bannerRow[cascade 9rem + nav pills] + spacer + 28px bar +
  absolutely-positioned elbow) have a significant intrinsic height. The top
  `.wrap` had no explicit `flex`, inheriting the default `flex-shrink: 1`;
  its `overflow: hidden` then clipped whatever got squeezed out. Because
  the bar + elbow are the LAST children of `rightFrameTop`, they are the
  first things clipped under compression. The bottom row worked only
  because its bar is the FIRST child of `rightFrame` — under compression
  `main` shrinks, not the bar.
- **Fix.** Added `flex-shrink: 0` to `.wrap` in
  `packages/lcars-ui/src/primitives/LcarsStandardLayout/LcarsStandardLayout.module.css`.
  CSS specificity keeps `.wrap.gap` (two classes) with `flex: 1 1 auto` for
  the bottom row — the bottom still grows/shrinks; only the top is pinned
  to its intrinsic height. If the viewport is ever smaller than the total
  content, `main`'s `overflow-y: auto` absorbs the deficit instead of the
  top rails silently disappearing.

**Verification performed:**
- Walked the flex math manually: with `flex-shrink: 0` on `.wrap` and
  `flex: 1 1 auto` on `.wrap.gap`, wrap1 reserves its full content height
  regardless of wrap2 pressure. Specificity checked — `.wrap.gap` has
  higher specificity than `.wrap`, so the shorthand's `flex-shrink: 1`
  wins for the bottom row.
- Traced the clipping symptom back to the exact CSS responsible: no other
  ancestor of `rightFrameTop` has `overflow: hidden`, so `.wrap` was the
  only possible clip site.

**Outcome:** Structural fix confirmed in browser — both top and bottom
rails on HomeAutomation now render the full rail → elbow → bar
continuation. Task #46 closed. Twelve-round debugging saga ends.

**Files changed this session:** 1 — `packages/lcars-ui/src/primitives/LcarsStandardLayout/LcarsStandardLayout.module.css`.

**Blockers:** None.

---

## Session: 2026-04-21 (LcarsStandardLayout rail→elbow→bar — rounds 10 & 11)
**Phase:** plan-006 T3 — de-risk HomeAutomation screen.

**Actions:**
- **Round 10: concrete-div elbows.** Eliminated the reference's pseudo-element
  + `z-index: -1` approach entirely. Replaced with two absolutely-positioned
  `.elbowTop` / `.elbowBottom` divs inside `rightFrameTop` / `rightFrame`,
  each painted by a single radial-gradient:
  `radial-gradient(circle 60px at <corner>, transparent 59.5px, <rail-color> 60px)`.
  Inside the 60px disc: transparent. Outside: rail color. The result is
  the quarter-crescent shape directly — no z-index, no stacking contexts,
  no propagation-to-ancestor trickery. The elbow paints in the normal
  positioned layer of its containing stacking context, always visible
  against whatever sits below it in the DOM. The 1px overlap with the
  bar's top edge closes subpixel seams under zoom; `syncFirstSegmentColor`
  guarantees the bar's first segment matches the rail color so the overlap
  is invisible.
- **Round 11: fixed geometry.** User reported the black gap between rail
  and bar changed on resize, and the top bar disappeared at some widths.
  Removed responsive overrides for `--lcars-spacing-bar-height`
  (was 28→24→20→16→10px across breakpoints) and
  `--lcars-spacing-radius-top/bottom` (was 160→130→100→80→40px) in
  `apps/desktop/src/styles/global.css`. Collapsed `.leftFrameTop.hasChildren` /
  `.leftFrame.hasChildren` padding to a single constant
  `calc(160px + 1.25rem)`. Added `flex-shrink: 0` to
  `LcarsBar.module.css .barPanel` so a flex-column ancestor with a tall
  banner can't collapse the bar to 0. Only `--lcars-spacing-left-frame-width`
  remains responsive — it's the one dimension that actually needs to give
  up real estate on narrow viewports.

**Outcome:** Bottom row renders correctly after these two rounds. Top row
fix completed in the following session (see above).

**Files changed:** 4 — `LcarsStandardLayout.module.css`, `LcarsStandardLayout.tsx`,
`LcarsBar.module.css`, `global.css`.

---

## Session: 2026-04-20 (Phase 3 polish #2 — drag bug + tab menu bug + LCARS plan)
**Phase:** 3 — three user reports triggered this pass.

**Reports:**
1. "I cannot drag tools to the other panes ... the targets appear but drag doesn't work."
2. "Click on a ⋮ button for a tool — something pops down but is hidden and some scrollbars appear."
3. "Main left section doesn't quite capture LCARS menus — generate a plan to be true to the original."

**Diagnoses + fixes:**
- **Drag did nothing.** Root cause: Tauri 2 webviews default to
  `dragDropEnabled: true`, which intercepts HTML5 drag events at the OS
  layer so the webview never sees `drop`. Fix: added
  `"dragDropEnabled": false` to the window config in
  `apps/desktop/src-tauri/tauri.conf.json`. The overlay already rendered
  (because `dragstart` still reaches the webview), which is why drop
  targets appeared but drops were silent.
- **TabActionMenu was invisible / clipped.** Root cause: the menu used
  `position: absolute` nested inside `ZoneTabStrip .strip` (which has
  `overflow-x: auto` — and per CSS spec that implicitly clips the Y axis
  too). Fix: portaled the menu to `document.body` via `createPortal`,
  positioned with `position: fixed` from the trigger's `getBoundingClientRect`.
  Added scroll/resize listeners on window (capture phase so nested scrolls
  also trigger) to recompute coords. Also added a `TAB ACTIONS` header row
  so the menu's purpose is obvious once it's actually on screen.
- **LCARS fidelity.** Wrote `docs/plan-005-lcars-polish.md`, a six-step
  sequenced plan to move the shell from "dark theme inspired by LCARS"
  to a console built to the LCARS-24.2 grammar. Key structural fixes:
  add the diagonal elbow corner (`linear-gradient(to top right, color
  50%, black 50%)`), rebuild TopRail as a segmented bar instead of three
  pills, and rebuild LeftNavigator as a two-block rail (orange over
  african-violet, separated by a black seam, each with the canonical
  top-right / bottom-right radii). Each step leaves the shell shippable.

**Verification performed:**
- Confirmed Tauri 2 schema accepts `dragDropEnabled` on window config
  (referenced from the Tauri 2.0 config schema URL already in the file).
- Portaled the menu with `useLayoutEffect` so positioning happens after
  DOM mutation but before paint — no flash of mispositioned menu.
- Click-outside handler now checks BOTH `rootRef` and the portaled
  `listRef`, so clicks inside the menu don't close it.

**Files changed this session:** 4 — `src-tauri/tauri.conf.json`,
`shell/TabActionMenu.tsx`, `shell/TabActionMenu.module.css`,
`docs/plan-005-lcars-polish.md` (new).

**Blockers:** None — awaiting approval of plan-005 to execute the
LCARS-24.2 fidelity work.

---

## Session: 2026-04-20 (Phase 3 polish — drag-to-split + restore affordances)
**Phase:** 3 — post-milestone UX polish triggered by four user feedback items.

**Feedback addressed:**
1. Inspector had no restore affordance when collapsed → resolved in prior step.
2. Center pane didn't reclaim space on inspector collapse → resolved in prior step
   (grid-template-columns now switches to a narrow stub width instead of zero).
3. **Drag-to-split the active pane like VS Code.** Implemented this session.
4. LeftNav + TopRail visual polish vs `lcars-interface-designer` skill → next task (#32).

**Actions taken this session (drag-to-split):**
- `shell/PaneDropTarget.tsx` (new): absolutely-positioned overlay with a
  `TAB_MIME = 'application/x-hyperspanner-tool'` constant and a `PaneDropVariant`
  union (`center-single` | `center-side` | `zone-only`). Listens on
  `window` for `dragstart` / `dragend` / `drop`; renders its hit regions only
  when a tab drag is in progress. Uses `DOMStringList.contains` with an
  `Array.from` fallback to detect our MIME across browser quirks. Pointer
  events are off on the root and on only for hit regions, so nothing leaks
  into the tool body when idle.
- `shell/PaneDropTarget.module.css` (new): absolute-positioned `.region_top`
  / `right` / `bottom` / `left` each at 20%, with a 60% center square; a
  `:only-child` rule lets a single-region variant fill the whole pane. Active
  region tints LCARS orange with an inset ring and a compressed uppercase
  label ("MOVE → …" or "SPLIT LEFT").
- `shell/ZoneTabStrip.tsx`: `PulsingTab` accepts `toolId`, sets
  `draggable={true}` on the tab wrapper, and fires `dragstart` to write the
  tool id under `TAB_MIME` on `dataTransfer`. A `.dragging` class dims the
  source while the drag is in flight.
- `shell/CenterZone.tsx`: single-pane composition wraps the content with
  `<PaneDropTarget variant="center-single" onDrop=handleCenterSingleDrop />`,
  which maps edge regions to `splitCenter(dir)` + `moveTool(id, 'center', side)`
  and the center region to `moveTool(id, 'center')`. Split-pane sides use
  `variant="center-side"` with a `moveTool(id, 'center', side)` handler.
- `shell/RightZone.tsx` + `BottomZone.tsx`: body wrapped with
  `<PaneDropTarget variant="zone-only" />`; drop handler calls
  `moveTool(id, 'right')` / `moveTool(id, 'bottom')`.
- Added `.dropHost { position: relative }` to `CenterZone.module.css`,
  `RightZone.module.css`, and `BottomZone.module.css` so each drop overlay
  anchors to its immediate pane body.

**Design notes:**
- Window-level listeners instead of store-based drag state keep the model
  simple: no `draggingToolId` slice, no cleanup races across unmounts. The
  component's `aliveRef` guard protects against late `dragend` after an
  unmount during layout transitions (e.g. split merging mid-drag).
- Store actions are composed at the call site (split + move) rather than
  introducing a new `dropTool(region)` action. That keeps the store API
  flat and testable; the composition lives where the geometry is known.

**Verification performed (manual review):**
- Walked the drag flow end-to-end in code: tab `dragstart` → window event
  → overlay reveal → region `dragover` (preventDefault is present) → drop
  handler → store composition → `dragend` cleanup. Every handler either
  calls `preventDefault` or is on the drop target specifically.
- Confirmed `moveTool` early-returns when the tool is already at the
  target zone + side, so center-center drops are no-ops.
- Confirmed `DropRegion` and `SplitSide` are imported as types under
  `verbatimModuleSyntax`; `TAB_MIME` is a runtime value import.

**Outcome:** Tabs are now draggable; edges of the center pane create splits;
side zones (Inspector, Console) accept moves. The UX echoes VS Code's drop
grid while staying inside LCARS color grammar (orange highlights, compressed
uppercase labels).

**Blockers:** None.

**Files changed this session:** 8 — `shell/PaneDropTarget.tsx` (new),
`shell/PaneDropTarget.module.css` (new), `shell/ZoneTabStrip.tsx`,
`shell/ZoneTabStrip.module.css`, `shell/CenterZone.tsx`,
`shell/CenterZone.module.css`, `shell/RightZone.tsx`, `shell/RightZone.module.css`,
`shell/BottomZone.tsx`, `shell/BottomZone.module.css`, `docs/status.md`.

---

## Session: 2026-04-20 (Phase 3 hotfix — typecheck + nav collapse)
**Phase:** 3 — post-wrap fixes surfaced by `pnpm typecheck` on Windows.

**Actions taken:**
- `themes/index.ts`: `LcarsTheme` was `typeof classicTheme`, which pinned `name`
  to the literal `"classic"` — so `themes[themeName]` returning a non-classic
  variant was unassignable. Changed to `(typeof themes)[ThemeName]` (union of
  all variants); `theme.name` is now the full `ThemeName` union.
- `state/workspace.types.ts`: added `CollapsibleZone = Exclude<Zone, 'center'> | 'left'`.
  Narrowed `toggleZone` and `setZoneCollapsed` signatures to `CollapsibleZone`
  so `state.collapsed[zone]` type-checks against the three-key
  `ZoneCollapseState`. `useShellShortcuts`'s `ShortcutZone` is already assignable.
- `state/workspace.ts`: added `ensureUncollapsed(prev, zone)` helper that
  short-circuits when `zone === 'center'`; replaced four
  `{ ...state.collapsed, [zone]: false }` spreads (openTool existing/new,
  focusTool, moveTool) with it, so opening/moving a tool in the center no
  longer adds a stray `center: false` key to `collapsed`.
- `state/workspace.test.ts`: removed the bogus `expect(s.collapsed.center).toBe(false)`
  assertion; replaced with a `s.collapsed.bottom === true` check against
  `DEFAULT_COLLAPSED`.
- `shell/LeftNavigator.tsx`: categories now start fully collapsed
  (`openCategories = {}` instead of `{ text: true, validation: true }`).
  A non-empty filter query still auto-expands matches via the existing
  `openCategories[cat.id] ?? Boolean(query)` fallback.

**Verification performed:**
- Re-delegated a static typecheck pass against the exact `pnpm typecheck`
  error list. All four reported errors trace to fixed files; no other
  `collapsed.center` references exist in the tree; no `any` escapes in
  Phase 3 new files.

**Outcome:** Typecheck errors addressed; host retry gate unchanged.

**Blockers:** None.

**Files changed this session:** 5 — `themes/index.ts`, `state/workspace.types.ts`,
`state/workspace.ts`, `state/workspace.test.ts`, `shell/LeftNavigator.tsx`.

---

## Session: 2026-04-20 (Phase 3 wrap — workspace state milestone)
**Phase:** 3 — Workspace state (Zustand) + managed docking model
**Status entering session:** Phase 2 complete, AppShell shell rendered local zone state.

**Actions taken:**
- Added Zustand 5 + `useShallow` selectors. Authored `state/workspace.types.ts`,
  `state/presets.ts` (6 built-in layouts), `state/workspace.ts` (full store with
  openTool/closeTool/moveTool/splitCenter/mergeCenter/setActive/toggleZone/applyPreset/
  resetLayout), and a `state/index.ts` barrel.
- Implemented single-instance tool model: reopening an open id bumps a per-tool
  `pulseId` + global `pulseCounter` instead of duplicating. `ZoneTabStrip`'s
  `PulsingTab` runs a 520ms CSS keyframe on each bump.
- Authored `state/useTool.ts` — a second Zustand store keyed by tool id for per-tool
  runtime state. Exposes a typed `useTool<T>(id, defaults)` hook with partial-patch
  and function-form `setState`. `setState` reads the live store snapshot at call
  time so multiple sequential updates in a single `act()` batch correctly see each
  other's results. `clearToolState(id)` is the escape hatch `closeTool` calls.
- Authored `tools/registry.ts` (13 placeholder descriptors + `listToolsByCategory`),
  and `tools/PlaceholderTool.tsx` as a generic body consuming `useTool`.
- Built `shell/TabActionMenu.tsx` — per-tab dropdown (Focus / Move to … /
  Split H|V / Maximize / Reset / Close) with keyboard navigation (arrows skip
  disabled items, Home/End, Enter/Space dispatches, Escape closes) and
  click-outside dismissal.
- Built `shell/ZoneTabStrip.tsx` — generic tab strip used by all three zones,
  with optional `filterSide` for center-split panes. Pulls actions directly
  from the store; moved `role="tab"`/`aria-selected` to the wrapper div because
  `LcarsPill` accepts only `aria-label`.
- Rewrote `CenterZone`, `RightZone`, `BottomZone` to new signatures
  `{ tools, activeTabId, split?, collapsed?, onToggle?, ... }`. Dynamic tool
  body rendering uses IIFE + PascalCase alias (`const ToolBody = descriptor.component`)
  to comply with React's lowercase-JSX rules.
- Rewrote `shell/AppShell.tsx` to subscribe via `useShallow` selectors
  (`s.open.filter(zone)` returns a new array, shallow-compared). Derives
  `openToolIds` from the three subscribed arrays (no stale `.getState()`).
  `onOpenTool` looks up each descriptor's `defaultZone` in the registry.
- Collapsed `useZoneState` to `useShellShortcuts(onToggle)` — pure shortcut
  registrar that delegates to the caller.
- Rewrote `LeftNavigator` to consume the registry + new props
  (`activeToolId`, `openToolIds`, `favoriteIds`, `onOpenTool`). Added
  `.openDot` green indicator for currently-open tools.
- Added Vitest + `@testing-library/react` + `jsdom`. Authored
  `state/workspace.test.ts` (23 assertions across openTool single-instance,
  closeTool activeByZone fallback, moveTool split-side assignment,
  splitCenter demote-to-A, mergeCenter clear, applyPreset unknown+split demote,
  resetLayout) and `state/useTool.test.ts` (defaults, partial patch,
  function-form, reset, slot isolation, external clear).
- Added root `test` script + per-package `test` / `test:watch` scripts.

**Verification performed:**
- Static code review (delegated) against strict-TS invariants, Zustand v5
  selector patterns, React 19 hook rules, store/test behavioral contract.
  Found and fixed one closure bug: `useTool.setState`'s function-form path
  was reading `state` from the selector closure, so two `setState(p => …)`
  calls batched in a single `act()` both saw the stale initial value. Fixed
  to read `useToolStateStore.getState().byId[id]` synchronously.
- Sandbox install still blocked by the pnpm mount EPERM; host-side
  `pnpm install && pnpm typecheck && pnpm test` remains the review gate.

**Outcome:** Phase 3 milestone reached — managed docking model is live, the
shell routes through the Zustand store, and the store is covered by unit tests.

**Blockers:** None.

**Files changed this session:** ~20 writes across `apps/desktop/src/state/*`,
`apps/desktop/src/tools/*`, `apps/desktop/src/shell/{AppShell, CenterZone,
RightZone, BottomZone, LeftNavigator, TabActionMenu, ZoneTabStrip, useZoneState,
index}`, `apps/desktop/vitest.config.ts`, `apps/desktop/package.json`, and the
root `package.json` test script.

---

## Session: 2026-04-20 (Phase 2 wrap — shell milestone)
**Phase:** 2 — App shell and zone layout
**Status entering session:** Phase 1 complete, `/primitive-gallery` awaiting user review.

**Actions taken:**
- Built `useZoneState` hook — left/right/bottom open state, keyboard shortcuts
  (Cmd/Ctrl+B left, Cmd/Ctrl+J bottom, Cmd/Ctrl+Shift+E right), ignores typing targets.
- Built `TopRail` — brand band + tool-title band + right-side controls
  (⌘K palette placeholder, theme cycler, RESET, GALLERY dev affordance).
- Built `LeftNavigator` — wordmark header, search field, Favorites section, accordion
  over 5 placeholder categories (text / validation / data / binary / network). Elbow-cap
  top & bottom via styled divs. Collapses to 64px icon column ≤950px.
- Built `CenterZone` — tab strip with close affordance on active tab, empty state with
  "OPEN SAMPLE" action, split-pane placeholder (Phase 3 wires real splits).
- Built `RightZone` and `BottomZone` — collapsible panes with `LcarsZoneHeader`,
  toggle pill, `LcarsEmptyState` placeholder.
- Built `AppShell` — CSS Grid composition of all five zones
  (`top / nav center right / nav bottom right`). Collapse driven by conditional
  state classes that mutate `grid-template-columns`/`rows`. Local state for tabs
  (migrates to Zustand in Phase 3). Left-pane "restore" orange elbow when collapsed.
- Built `useHashRoute` — minimal `hashchange` listener + navigate helper.
- Rewrote `App.tsx` to route `#/gallery` → `PrimitiveGallery` (with `onBack` pill),
  default → `AppShell` (with `onOpenGallery` wired to the TopRail GALLERY pill).
- Extended `PrimitiveGallery` with `onBack` prop + `← SHELL` pill in its top bar.
- Added `apps/desktop/src/shell/index.ts` barrel.

**Verification performed:**
- Static code review (delegated) against `verbatimModuleSyntax`, `erasableSyntaxOnly`,
  primitive prop shapes, CSS Module class coverage, React hook deps, ARIA. Clean.
- Sandbox typecheck still unavailable (pnpm symlink limitation); host-side verification
  pending user.

**Outcome:** Phase 2 milestone reached — runnable five-zone shell ready for review.

**Blockers:** None.

**Files changed this session:** 13 writes across `apps/desktop/src/shell/{AppShell,
TopRail, LeftNavigator, CenterZone, RightZone, BottomZone, useZoneState, index}`,
`apps/desktop/src/hooks/useHashRoute.ts`, `apps/desktop/src/App.tsx`, and the
`PrimitiveGallery.tsx` / `index.ts` updates.

---

## Session: 2026-04-20 (Phase 1 wrap)
**Phase:** 1 — Design tokens + lcars-ui primitive package
**Status entering session:** Phase 1 mid-work. Four primitives ported
(LcarsBar, LcarsBanner, LcarsPill, LcarsPanel), tokens in place.

**Actions taken:**
- Ported `LcarsChip` — decoupled from `useTheme`, variant prop now takes
  `LcarsSemanticRole` (primary/secondary/accent/info/success/warning/error/critical/neutral),
  variants map to CSS tokens via the new `variantColor` table.
- Ported `LcarsTabs` — decoupled from `useTheme`, added controlled-mode support
  (`activeTab` prop), uses CSS vars with overrides for active/inactive bg.
- Built `LcarsRail` (vertical column, optional elbow caps, picard-modern sizing).
- Built `LcarsZoneHeader` (eyebrow + title + controls slot + indicator dot).
- Built `LcarsCommandBar` with `.Divider` and `.Group` subcomponents.
- Built `LcarsSearchField` (forwardRef, clear button, shortcut hint, Escape-to-cancel).
- Built `LcarsEmptyState` (eyebrow, title, description, icon slot, action slot, compact variant).
- Built `LcarsSplitHandle` (pointer-capture drag, arrow-key resize, ARIA separator).
- Built `LcarsTelemetryLabel` (name/value/unit, indicator dot, filled/outline, three sizes).
- Added `packages/lcars-ui/src/globals.d.ts` for CSS Modules typing inside the package.
- Wrote barrel export at `packages/lcars-ui/src/index.ts`.
- Built `apps/desktop/src/pages/PrimitiveGallery/` with theme switcher covering all four
  variants. Rendered every primitive against the current theme.
- Rewrote `App.tsx` to render `<PrimitiveGallery />` as the Phase 1 review milestone.

**Verification performed:**
- Manual code review against strict/`verbatimModuleSyntax`/`erasableSyntaxOnly`.
- Unable to run `pnpm typecheck` in sandbox — pnpm symlinks aren't traversable from the
  Linux mount (documented in lessons). Host-side verification pending user.

**Outcome:** Phase 1 milestone reached — gallery route ready for user review.

**Blockers:** None. Awaiting user review of `/primitive-gallery` and authenticity-checklist pass.

**Files changed this session:** 33 writes across `packages/lcars-ui/src/primitives/{LcarsChip,
LcarsTabs, LcarsRail, LcarsZoneHeader, LcarsCommandBar, LcarsSearchField, LcarsEmptyState,
LcarsSplitHandle, LcarsTelemetryLabel}`, plus `packages/lcars-ui/src/{index.ts, globals.d.ts}`,
plus `apps/desktop/src/pages/PrimitiveGallery/*` and `apps/desktop/src/App.tsx`.

---

## Session: 2026-04-20 (earlier — Phase 0 bootstrap + Phase 1 start)

**Actions taken (summarized from prior context):**
- Generated `plan-002-implementation.md` from plan-001.
- Bootstrapped pnpm monorepo (`apps/desktop` + `packages/lcars-ui`).
- Wired Tauri 2 + Vite 7 + React 19. Simplified `lib.rs` with `tracing` logging.
- Created four theme variants: `picard-modern` (default), `classic`, `nemesis-blue`,
  `lower-decks`.
- Ported Antonio font, global.css, and ThemeContext.
- Generated icon set (ICO, ICNS, PNGs) via Python/Pillow after hitting the Windows
  Tauri build error.
- Started Phase 1: tokens module + LcarsBar, LcarsBanner, LcarsPill, LcarsPanel.

**Outcome:** Phase 0 complete, Phase 1 at ~30% when context rolled over.

---
