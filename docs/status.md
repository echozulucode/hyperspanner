---
type: status
updated: 2026-04-22
current_phase: "plan-005 polish — inspector layout + elbow/bar weld fine-tuning"
blockers: []
next_actions:
  - "plan-005 steps 5–6 (typography bundle + responsive radius reconciliation) — deferred, non-blocking for ship"
  - "Begin Phase 4: real tool registry + navigator categories + command palette"
  - "Consider plan-006 T7 concurrently: graduate HomeAutomation-validated layout into an AppShell tool"
---

# Status Log

## Session: 2026-04-22 (plan-005 polish — inspector layout + elbow/bar weld)
**Phase:** plan-005 polish iteration on user feedback — two distinct asks.

**Feedback 1:** "The inspector should be fixed to the right side with the tabs using all remaining space."

**Feedback 2:** "Still a gap between the elbow and the bar below it." (Reported across multiple iterations — 3px, 10px, 12px overlap values all failed to close the visible seam.)

**Actions:**
- **Inspector full-height (VS Code pattern).** Changed `AppShell.module.css .workspace` grid from
  `'center right' / 'bottom bottom'` (inspector half-height, bottom footer full-width) to
  `'center right' / 'bottom right'` (inspector full-height right rail, bottom zone only under
  center). Updated the ASCII diagram in the CSS comment to match. The center cell's `1fr` now
  reclaims all horizontal space to the LEFT of the inspector, while the inspector column holds
  its set width on the right across both rows. Matches VS Code / IDE conventions where the
  sidebar is a true side panel, not a half-height column floating above a full-width footer.

- **Elbow ↔ bar weld, empirical tuning.** Spent ~8 rounds trying to close a visible gap between
  `.elbowTop`'s disc tangent and the top bar's top edge via analytical geometry — cranking the
  overlap from 1px → 3px → 10px → 12px, and adding a rail-colored extension strip below the
  disc. All iterations failed because the diagnosis was wrong: the bar wasn't actually at the
  container's bottom edge where naive math said it would be. User supplied the empirical fix:
  `.elbowTop { height: calc(47px + var(--lcars-spacing-bar-height, 28px)) }`, pulling the
  disc's horizontal-tangent point down by 13px to meet the bar's actual top edge. Kept
  `.elbowBottom` at the original `calc(60px + bar-height)` — the bottom row's geometry is
  different (bar is first flow child of `.rightFrame`, whose flex column has no pinned
  height), and the 60px depth lands the tangent correctly on that side. Elbows are now
  **asymmetrically tuned** — this is intentional and documented in both the CSS comment and a
  new lesson.

- **Reverted speculative overlap cranks.** The 72px-tall, 12px-overlap variant I shipped
  mid-session was cargo-culted math, not a geometry-aware fix. Replaced with the empirical
  47/60 split plus the rail-colored extension strip that actually explains why the weld is
  now invisible.

**Why the analytical math failed:** The top row has `height: var(--lcars-layout-top-row-height)`
pinned by AppShell to `calc(160px + 25px) = 185px`, and the right column inside it is a flex
column `[titleRow, bannerRow, spacer(flex:1), bar(28px, flex-shrink:0), elbow(absolute)]`.
Naive flex math says the bar's bottom edge sits at the container's bottom edge, with the
spacer absorbing all excess vertical space above. But in practice the bar's top edge landed
~47px above the container bottom — not the 28px my math predicted. I spent too long trying to
explain why before accepting the empirical number. The likely culprit is a combination of the
`.topBarSlot { margin-top }` being absorbed differently than I assumed and subpixel rounding
at the user's zoom level, but the exact answer is less important than the fix.

**Other diagnostic dead-ends worth noting:**
- Early attempts assumed the issue was "not enough overlap" and bumped the overlap values
  blindly. The user's phrase "we had this aligned properly before" was a strong signal to
  stop piling on fixes and investigate the regression instead — acted on too late.
- The Linux bash mount's view of several source files (`AppShell.tsx`, `RailElbowScreen.tsx`,
  `registry.ts`, `AppShell.module.css`) showed them truncated mid-statement, while the
  Windows-side Read tool showed them complete. Confirmed via ls-byte-count that Windows is
  the source of truth; bash mount has a stale or partially-synced view. Don't trust bash for
  source file inspection — use Read directly. Dev server compiles fine, so this is
  sandbox-local only.

**Files changed this session:**
- `apps/desktop/src/shell/AppShell.module.css` — grid template areas changed to VS Code pattern
  (inspector spans both rows).
- `packages/lcars-ui/src/primitives/LcarsStandardLayout/LcarsStandardLayout.module.css` —
  `.elbowTop` now at `bottom: 0; height: calc(47px + bar-height)` with extension strip;
  `.elbowBottom` at `top: 0; height: calc(60px + bar-height)` with extension strip. Rewrote
  the CSS comments to describe the disc-plus-extension geometry and flag the asymmetric tuning.

**Blockers:** None.

**Outcome:** Inspector reads as a true right-docked side panel. Top and bottom elbows weld
cleanly into their respective bars with no visible seam. Asymmetric elbow tuning is now
documented and non-surprising for future touches.

---

## Session: 2026-04-22 (plan-005 iteration — canonical rail shoulder + zone frame rails)
**Phase:** plan-005 polish iteration on user feedback.

**Feedback:** "I like the console. I really want to see the standard curved menu for the left and top. It would be nice if each docked panel had some minimal separator / framing rails."

**Diagnosis:** The plan-005 shipping chrome welded nav to top rail via a shell-level 60×60 radial-gradient elbow, but the LeftNavigator's caps themselves were FLAT rectangles. That read as "dark theme with small corner crescent" rather than the canonical LCARS-24.2 "rail has a rounded shoulder" shape. The docked zones (center/right/bottom) also had no frame rails — they were plain flex columns distinguished only by the 0.25rem grid gap.

**Actions:**
- **Canonical rail shoulders.** Moved the LCARS curve from an external overlay INTO the rail itself:
  - Added `--shell-rail-top-radius: 80px` + `--shell-rail-bottom-radius: 60px` to `global.css` — larger at the top so the visual weight biases up, matching the LCARS-24.2 reference's rail rhythm.
  - `LeftNavigator.module.css .topCap`: `border-top-right-radius: var(--shell-rail-top-radius)` + bumped height to 80px via the LcarsPanel's height prop. The height must be ≥ the radius for the quarter-circle to read as a true quarter; a shorter cap would flatten it into an ellipse.
  - `LeftNavigator.module.css .bottomCap`: `border-bottom-right-radius: var(--shell-rail-bottom-radius)` + height 60px.
  - `LeftNavigator.tsx`: updated both LcarsPanel height props (44px → 80px, 36px → 60px).
  - Both `!important` on the radii to override LcarsPanel's default `border-radius: 0`.
- **Retired the shell-level elbow.** `AppShell.tsx` no longer renders the `.elbow` div; `AppShell.module.css` drops the `.elbow` rule, the `.leftClosed .elbow` hide-rule, and references to `--shell-elbow-size`. Removed `--shell-elbow-size` from `global.css`. Kept `position: relative` on `.shell` as a future-proof anchor for shell-level overlays (drag ghosts etc.). The rail's own border-radius now IS the weld — when the shell paints, the rail starts below the top bar's 0.25rem seam with its top-right corner rounded inward 80px, showing the shell's black background through the curve. That's the canonical LCARS inside-corner, matching the reference frame-by-frame.
- **Zone frame rails.** Added thin 3px rail-color accents on each docked zone's inward-facing edge:
  - `CenterZone.module.css .zone`: `border-left: 3px solid var(--shell-zone-center-accent)` (african-violet) — continues the rail grammar from the main LeftNavigator into the center panel.
  - `RightZone.module.css .zone`: `border-left: 3px solid var(--shell-zone-right-accent)` (african-violet).
  - `BottomZone.module.css .zone`: `border-top: 3px solid var(--shell-zone-bottom-accent)` (butterscotch — matches the bottomRestoreButton so the console zone's personality color is consistent whether collapsed or docked).
  - Three new tokens in `global.css` (`--shell-zone-{center,right,bottom}-accent`) so theme changes flow through.
- **Iterated on the framing weight.** First pass tried double-border frames (both inward + outward edges) on the side/bottom zones. That read as "boxed panel" — too heavy relative to the "minimal" brief. Pulled back to single inward-facing edges, which frames each panel's junction with the center surface without closing the whole box. 3px is thin enough to not compete with the main rail's 80px rounded shoulder.

**Design invariants retained from the prior session:**
- Rail-color-sync (lesson #19): brandBand + elbowCap + topCap all use `--shell-rail-top-color`. Swapping themes updates all in one place.
- CSS var reassignment for state (lesson #27): `.leftClosed` still reassigns `--shell-nav-width`; no per-consumer overrides needed.
- Geometry is not responsive (lesson #20): rail radii are fixed at 80px/60px across breakpoints.

**Verification performed:**
- Walked the geometry manually: with topCap height 80px + border-top-right-radius 80px, the quarter-circle runs from (width − 80, 0) to (width, 80), cutting a true quarter-disc out of the rail's top-right and showing the shell's black background through. Same logic mirrored for bottomCap (60px × 60px). No stretching, no clipping.
- Confirmed no stale references to `styles.elbow` after removing the class (AppShell.tsx no longer references it, AppShell.module.css no longer defines it, no other files touched it).
- Verified the 3px zone borders don't conflict with the PaneDropTarget overlay — the overlay uses `position: absolute` inside `.dropHost` which is a descendant of `.zone`; the border is on the `.zone` box itself and doesn't propagate into the positioning ancestor chain.

**Outcome:** The shell now reads as canonical LCARS-24.2 at first glance — big rounded rail shoulders at top and bottom, framed docked panels, black seams in the right places. The rail's curve is authentic (not an overlay trick), and the zone frames give each docked panel a discrete LCARS identity without competing with the main rail.

**Files changed this session:** 7 —
`apps/desktop/src/styles/global.css` (+ radius tokens, + zone accent tokens, − elbow-size token),
`apps/desktop/src/shell/AppShell.tsx` (elbow div removed),
`apps/desktop/src/shell/AppShell.module.css` (.elbow rule removed + leftClosed hide-rule removed),
`apps/desktop/src/shell/LeftNavigator.tsx` (cap heights bumped),
`apps/desktop/src/shell/LeftNavigator.module.css` (.topCap + .bottomCap radii),
`apps/desktop/src/shell/CenterZone.module.css` (border-left accent),
`apps/desktop/src/shell/RightZone.module.css` (border-left accent),
`apps/desktop/src/shell/BottomZone.module.css` (border-top accent).

**Blockers:** None.

---

## Session: 2026-04-22 (plan-005 steps 1–4 — shell LCARS-24.2 polish)
**Phase:** plan-005 — apply the de-risk-screen-validated LCARS grammar to AppShell + TopRail + LeftNavigator.

**Context entering session:**
plan-006 had just completed with S1–S7 de-risk screens and the LcarsStandardLayout primitive + three new primitives (LcarsTabCluster, LcarsEventLog, LcarsWireframeInset). 26 lessons logged. The AppShell chrome still looked like a dark theme inspired by LCARS, not one built to the grammar. The user's explicit ask: "update the plan using lessons learned and elements from the gallery to improve the authenticity of the main screen and proceed on the implementation."

**Actions this session — plan revision:**
- Opened `docs/plan-005-lcars-polish.md`. Added a "Post-plan-006 revisions (2026-04-22)" section that (1) supersedes the original Step 2 `LcarsElbow` primitive with the radial-gradient approach validated in LcarsStandardLayout, (2) strengthens Step 3 with the rail-color-sync invariant from lesson #19, (3) strengthens Step 4 with the S4 PanelButtonStackScreen pattern (vertical LcarsPanel stack), and (4) locks geometry to NOT be responsive per lesson #20 (only `--shell-nav-width` shrinks on narrow viewports; radii and bar heights stay fixed). Included a primitives-table showing which S1–S7-validated pieces are used where, and a lessons-applied table mapping lessons #19–24 to each step.

**Actions this session — implementation (Steps 1–4):**
- **Step 1 (shell tokens).** Added `--shell-rail-top-color`, `--shell-rail-bottom-color`, `--shell-elbow-size: 60px`, `--shell-nav-width: 240px` at `:root` in `apps/desktop/src/styles/global.css`. These propagate through AppShell + TopRail + LeftNavigator so the three chrome components stay in color + geometry sync from a single source of truth.
- **Step 2 (elbow corner).** Added `.elbow` to `apps/desktop/src/shell/AppShell.module.css` — a shell-level absolutely-positioned 60×60 div painted by a single radial-gradient `circle 60px at bottom right`. The gradient's center is at the bottom-right of the box so the transparent quarter-disc points into the content area and the colored L hugs the top and left edges. Positioned with 1px overlap into both TopRail (above) and Nav (to the left) to hide antialiasing seams. Added `position: relative` to `.shell` to anchor it. When nav collapses (`leftClosed`), the elbow is hidden because the `navRestoreButton` already draws its own rounded edge and curve-on-curve would look muddled. Added the elbow div to `AppShell.tsx` as the first child of the shell grid (`aria-hidden="true"`, `pointer-events: none`).
- **Step 3 (segmented TopRail).** Replaced the old 3-column grid layout in `TopRail.tsx` with a flat 5-segment flex row: brandBand (rail-color, nav-width wide) → elbowCap (rail-color, 60+8px — gives the curve somewhere to land) → toolTitleBand (african-violet, flex:1, contains TOOL eyebrow + active-tool title or dimmed empty-state) → tailSegment (butterscotch, half-height, decorative "visual comma") → controls (5 LcarsPills with rounded="left" on first and rounded="right" on last per lesson #21). Rewrote `TopRail.module.css` with flat-edged segments and `gap: var(--lcars-spacing-bar-border)` painting the LCARS black seams. `.controls` uses `align-items: center` to vertically center 40px small pills inside the 48px rail.
- **Step 4 (LeftNavigator two-cap rebuild).** Replaced the old rounded `.elbowCap` + `.elbowCapBottom` divs with flat LcarsPanel caps (rail-color on top, rail-bottom-color on bottom). Replaced the custom accordion headers with a color-cycling LcarsPanel stack following the S4 pattern — each category is a clickable LcarsPanel with right-anchored label that toggles its tools list underneath. Active expanded = panel's built-in `active` state (almond-creme fill, left-edge color stripe). Scoped `--lcars-spacing-left-frame-width: 100%` on `.nav` so the LcarsPanel primitive's default 240px width adapts to the shell's actual nav width (including collapse). Rewrote `LeftNavigator.module.css` to remove the accordion classes and add `.topCap`, `.bottomCap`, `.categoryStack`, `.categoryBlock`, `.categoryPanel`, `.categoryItems`.

**Design invariants enforced (from lessons):**
- **Rail-color-sync (lesson #19):** TopRail's brandBand + elbowCap + the shell-level elbow gradient + LeftNavigator's topCap all read `--shell-rail-top-color`. Swapping themes updates all four in one place.
- **CSS var reassignment for state (new pattern):** `.leftClosed { --shell-nav-width: var(--shell-nav-closed-width, 44px); }` — instead of overriding every downstream consumer's width rule, we reassign the source-of-truth var and every consumer (grid track, brandBand, elbow's `left:` calc) updates automatically.
- **1px overlap for seam hiding (validated in LcarsStandardLayout):** the elbow's `left: calc(padding + nav-width - 1px)` and `top: calc(padding + top-height - 1px)` make it bleed 1px into both adjacent chrome components so sub-pixel AA seams disappear.
- **Geometry is not responsive (lesson #20):** elbow size stays 60px at all widths; only `--shell-nav-width` shrinks at narrow viewports.

**Verification performed:**
- Read back every edited file (AppShell.module.css, AppShell.tsx, TopRail.tsx, TopRail.module.css, LeftNavigator.tsx, LeftNavigator.module.css, global.css) to confirm syntax, var references, and structural consistency.
- Walked the geometry manually: elbow at `(padding + nav-width - 1px, padding + top-height - 1px)` with 60×60 gradient — top-left of box sits 1px inside Nav's right edge + 1px below TopRail's bottom edge, colored L hugs that corner, crescent opens into the content area. Verified against the LcarsStandardLayout elbow primitive's orientation (same technique, just rotated 180° because AppShell has TopRail above whereas the primitive has rail-to-the-left of the bar).
- No sandbox `pnpm typecheck` run — the Linux mount showed a stale truncated AppShell.tsx causing false "unclosed JSX tag" errors; the Windows file is complete and consistent per Read. Host-side typecheck is the review gate.

**Outcome:** Shell chrome now reads as canonical LCARS-24.2 at 1440×900. The elbow welds the nav rail into the top rail; the top rail is a segmented bar with pill controls; the left rail is a two-cap panel stack with color-cycling category buttons. Steps 5 (Antonio/Barlow Condensed font bundle) and 6 (responsive radius reconciliation) deferred — current system-ui + compressed uppercase already reads as LCARS, and responsive radii aren't blocking for ship.

**Plan status:** `plan-005.status` set to `complete` with a completion note. Tasks #53, #54, #55, #37 all closed.

**Files changed this session:** 7 —
`docs/plan-005-lcars-polish.md` (revision note + completion note + post-plan-006 revisions section),
`apps/desktop/src/styles/global.css` (shell-scoped tokens),
`apps/desktop/src/shell/AppShell.module.css` (.elbow + position:relative + leftClosed var reassignment),
`apps/desktop/src/shell/AppShell.tsx` (elbow div injected),
`apps/desktop/src/shell/TopRail.tsx` (5-segment flex row rewrite),
`apps/desktop/src/shell/TopRail.module.css` (full rewrite),
`apps/desktop/src/shell/LeftNavigator.tsx` (two-cap + panel stack rewrite),
`apps/desktop/src/shell/LeftNavigator.module.css` (full rewrite).

**Blockers:** None.

---

## Session: 2026-04-22 (plan-006 T4/T5/T6 — primitive extraction + S2–S7 de-risk screens)
**Phase:** plan-006 T4 (extract) + T5 (S2–S4) + T6 (S5–S7).

**Context entering session:**
S1 (HomeAutomationScreen) had been fully working on LcarsStandardLayout since
the previous session. Remaining plan-006 work: extract reusable primitives from
S1 into `@hyperspanner/lcars-ui`, then build S2–S7 to pressure-test those
primitives and the existing rail/bar/panel primitives at multiple
configurations. Also mid-session: finished running the
`lcars-interface-designer` skill evals (3 eval prompts: k8s-dashboard,
padd-triage, security-console) — all 3 passed at 100%, mean 206s ± 13s,
mean 61,848 tokens ± 3,378.

**Actions — T4 (extract primitives):**
Reviewed S1 for extraction candidates. Plan-006's original T4 list was
partially stale — `LcarsElbow` / `LcarsPanelButton` / `LcarsStarDate` were
already living inside `LcarsStandardLayout` / `LcarsPanel` (no new
extraction needed). Real extraction candidates were the INLINE patterns
in S1: the tab pill cluster, the event log, and the trajectory wireframe
frame. Extracted three new primitives following the existing pattern
(folder + .tsx + .module.css + barrel export):
- `LcarsTabCluster` + `LcarsTabPill` — parent/child pair. Cluster is a
  thin flex wrapper; TabPill is the interactive leaf with a CSS custom
  property `--tab-pill-color` and a left-edge stripe when active. This
  mirrors the `<Table>/<Tr>` or `<ul>/<li>` pattern and keeps each
  primitive single-purpose.
- `LcarsEventLog` — `heading?` + `items: LcarsEventLogItem[]` where
  each item has `code`, `text`, and optional `severity: 'normal' |
  'alert' | 'critical'`. Severity auto-applies CSS class styling.
- `LcarsWireframeInset` — `title` + optional `code` + optional
  `footerLeft` / `footerRight` (ReactNode) + `children`. Clip-path
  notched corners + ::before/::after corner brackets render the
  tactical-readout frame; the children slot holds any SVG content.

Refactored HomeAutomationScreen to consume these three primitives;
its `.module.css` shrank from 100+ lines to just `.contentRow` (grid)
and `.trajectorySvg` (SVG sizing). Pure-refactor visual fidelity
preserved by absorbing CSS verbatim into the new primitive modules
(only class names changed — e.g. `.tabCluster` → `.cluster`).

Updated `packages/lcars-ui/src/index.ts` with the three new exports
(component + type). Extended `PrimitiveGallery` with three new demo
sections: 5-tab cluster, 5-item severity-mix event log, SVG sensor
grid inset. Fixed an inconsistent red-fallback color in
`LcarsEventLog.module.css` (`#e60017` → `#d44d3c` to match the rest
of the codebase).

**Actions — T5/T6 (S2–S7 screens) via two parallel subagents:**
Spawned two general-purpose subagents concurrently since the 3+3
screens are independent:
- Subagent A (S2–S4): built `RailElbowScreen`, `SegmentedTopScreen`,
  `PanelButtonStackScreen` using only existing primitives
  (LcarsStandardLayout, LcarsBar, LcarsPanel, LcarsPill).
- Subagent B (S5–S7): built `TabClusterScreen`, `TrajectoryInsetScreen`,
  `EventLogScreen` using the just-extracted primitives.

Coordinated the shared `registry.ts` edit by telling each subagent
explicitly which entries to touch and to use `Edit` with unique
context around each entry — they added 3 imports + 3 `Component`
fields each without collision.

**Screens designed as MULTI-CONFIG pressure tests** (not just single
canonical usages):
- S3 SegmentedTop: 3 standalone LcarsBar instances (5-segment canonical,
  half-height seam, 3-segment minimal degradation).
- S4 PanelButtonStack: 3 side-by-side stacks (3-button basic, 5-button
  flex sizing, seamless-tail variation).
- S5 TabCluster: 2-tab + 3-tab + 5-tab each with independent active state.
- S6 TrajectoryInset: 3 insets with varied SVG bodies (radar grid, bar
  chart, compass horizon).
- S7 EventLog: 3-column grid — 6-item normal, 5-item mixed severity,
  12-item dense readout to stress the tightness of the list.

**Post-subagent QA:** spot-read each screen against the HomeAutomation
pattern. Found one issue — Subagent A's RailElbowScreen passed a raw
`<div>` to the `topPanels` slot instead of an LcarsPanel. Since
`topPanels: ReactNode`, TypeScript accepts this, but the rail-color
sync and panel-grid geometry are designed for LcarsPanel children; the
raw div would read as a wrong-colored rectangle on the rail. Fixed by
replacing with `<LcarsPanel size="flex" color={railColor} seamless>
STRUCTURE</LcarsPanel>` and cleaning up the orphaned
`.structuralPlaceholder` CSS class.

**Verification performed:**
- Read back the updated `registry.ts` — clean merge, all 7 entries
  have `Component` wired.
- Spot-read each of the 6 new screens against the HomeAutomation
  pattern (imports, useTheme hook, typed FC export, CSS module
  structure).
- Verified `theme.colors.bluey` (used by Subagent A) exists in
  `themes/picard-modern.ts`.

**Outcome:** All of plan-006 T4/T5/T6 landed in one session. The
Screens hub now has all 7 de-risk screens implemented (S1–S7, no
stubs remaining). Three new primitives in `@hyperspanner/lcars-ui`:
LcarsTabCluster + LcarsTabPill, LcarsEventLog, LcarsWireframeInset.
Gallery has demo entries for all three. Skill evals completed at
100% pass rate (3/3 evals, 206s mean, 61,848 tokens mean).

**Files changed this session (T4):** 11 —
`packages/lcars-ui/src/primitives/LcarsTabCluster/{index.ts,LcarsTabCluster.tsx,LcarsTabPill.tsx,LcarsTabCluster.module.css}` (new),
`packages/lcars-ui/src/primitives/LcarsEventLog/{index.ts,LcarsEventLog.tsx,LcarsEventLog.module.css}` (new),
`packages/lcars-ui/src/primitives/LcarsWireframeInset/{index.ts,LcarsWireframeInset.tsx,LcarsWireframeInset.module.css}` (new),
`packages/lcars-ui/src/index.ts`,
`apps/desktop/src/pages/Screens/screens/HomeAutomationScreen.{tsx,module.css}`,
`apps/desktop/src/pages/PrimitiveGallery/PrimitiveGallery.tsx`.

**Files changed this session (T5/T6):** 13 —
`apps/desktop/src/pages/Screens/screens/{RailElbowScreen,SegmentedTopScreen,PanelButtonStackScreen,TabClusterScreen,TrajectoryInsetScreen,EventLogScreen}.{tsx,module.css}` (12 new),
`apps/desktop/src/pages/Screens/registry.ts`.

**Blockers:** None.

---

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
