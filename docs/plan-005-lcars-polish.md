---
type: plan
id: plan-005
title: LCARS-24.2 polish — LeftNavigator + TopRail + shell seams
status: complete
owner: hyperspanner
created: 2026-04-20
updated: 2026-04-22
revision_note: |
  Revised after plan-006 completion. The de-risk screens (S1–S7) and the
  LcarsStandardLayout primitive validated the rail + elbow + segmented-bar
  grammar in seven pressure-test contexts. The original plan-005 step 2
  proposed building a new `LcarsElbow` primitive; this is superseded by
  the radial-gradient approach already validated inside LcarsStandardLayout
  (lessons #19–22). New primitives extracted in plan-006 T4 — LcarsTabCluster,
  LcarsEventLog, LcarsWireframeInset — also unlock cleaner patterns for
  category listings and active-tool readouts. See "Post-plan-006 revisions"
  section below.
completion_note: |
  Steps 1–4 shipped 2026-04-22. Shell-scoped tokens landed in
  apps/desktop/src/styles/global.css; the radial-gradient elbow is a
  shell-level absolutely-positioned div in AppShell with 1px overlap
  into both TopRail and LeftNavigator. TopRail is now a five-segment
  flex row (brand + elbow cap + active-tool band + tail + pill
  cluster). LeftNavigator is two flat LcarsPanel caps around a
  middle content column whose categories are a color-cycled
  LcarsPanel stack following the S4 pattern (expanded categories
  render their tools in a nested inset sub-list). Steps 5 (Antonio
  typography bundle) and 6 (responsive radius reconciliation) are
  deferred to a Phase 4 follow-up — current system-ui + uppercase
  reads as LCARS at 1440×900, and the radii token sweep is not
  blocking for ship.
---

# Plan 005 — LCARS-24.2 polish

## Why

The current shell renders the right primitives (pills, bands, zone headers)
but does not yet **read as LCARS**. It looks like a dark theme *inspired by*
LCARS rather than a console *built to the LCARS grammar*. Specifically,
feedback on the 2026-04-20 review was: *"the main left section doesn't quite
capture LCARS menus."*

After re-reading `reference/lcars-example/external/LCARS-24.2/assets/*` and
`reference/lcars-example/src/styles/lcars.css`, three structural elements
are missing, and three stylistic details are weak. This plan enumerates
them and proposes a sequenced fix so we don't regress the working Phase 3
docking / drag-to-split behavior.

## Post-plan-006 revisions (2026-04-22)

Plan-006 shipped seven de-risk screens (S1–S7) + LcarsStandardLayout +
three new primitives (LcarsTabCluster, LcarsEventLog, LcarsWireframeInset).
The work logged 26 lessons in `docs/lessons.yaml`. Applying those lessons
changes this plan in four concrete ways:

1. **Step 2 supersession.** The original plan proposed a new `LcarsElbow`
   primitive. Plan-006 validated an inline radial-gradient elbow inside
   LcarsStandardLayout over twelve rounds of debugging (lessons #19, #20,
   #21, #22). The pseudo-element `z-index: -1` approach from the LCARS-24.2
   reference was brittle across stacking contexts. The radial-gradient
   method has no stacking-context dependencies and paints reliably from
   inside any containing block. **Revised approach:** no new primitive —
   inline a 60×60px radial-gradient div inside the AppShell grid cell at
   the nav↔topRail join. If it recurs in more than one place, extract to
   `LcarsShellElbow` later (YAGNI).

2. **Step 3 strengthened with rail-color-sync invariant.** Lesson #19:
   when the rail flows into the bar, the bar's FIRST segment must match
   the rail color exactly, or a mismatched-color seam appears at the
   continuation. In LcarsStandardLayout this is auto-enforced by
   `syncFirstSegmentColor`. In AppShell we'll enforce it by having
   `LeftNavigator.topCapColor` and `TopRail.leftSegmentColor` share a
   single CSS custom property `--shell-rail-top-color`.

3. **Step 4 strengthened with panel-button pattern from S4.** The
   `PanelButtonStackScreen` (S4) proved out the vertical LcarsPanel stack
   pattern. The LeftNavigator category accordion rows should follow that
   same pattern — LcarsPanel with `size="flex"`, `active` state, and
   right-anchored black-on-color labels. Favorites become a compact pill
   row (no panel bloat for 2 items).

4. **Geometry is NOT responsive.** Lesson #20: scaling rail radius and
   bar height across breakpoints broke the signature LCARS curve
   recognition. Only `--shell-nav-width` should shrink on narrow
   viewports; `--lcars-radius-top`, `--lcars-radius-bottom`,
   `--lcars-spacing-bar-height` stay fixed.

### Primitives we now have (unlocking cleaner patterns)

| Primitive | Where we use it in plan-005 | Pressure-tested in |
|-----------|------------------------------|---------------------|
| `LcarsBar` | Segmented TopRail (step 3) | S1, S3 |
| `LcarsPanel` | Category rows + rail caps (step 4) | S1, S4 |
| `LcarsPill` | TopRail controls cluster + favorites (steps 3,4) | S1, S5 |
| `LcarsStandardLayout` | *Not used* — AppShell keeps its 5-zone grid. The primitive is for single-screen LCARS panels, not multi-zone IDEs. We borrow its grammar (rail+elbow+bar) without wrapping in the primitive. | S1, S5, S6, S7 |
| `LcarsEventLog` | Optional — could render in the bottom zone's console when empty. Deferred. | S1, S7 |
| `LcarsWireframeInset` | Optional — could frame the center zone when no tool is open. Deferred. | S1, S6 |

### Lessons we're applying

| Lesson | Applied in step | What it changes |
|--------|------------------|-----------------|
| #19 rail→bar color sync | step 3 | Top bar's leftmost segment color locked to nav rail top color via CSS var |
| #20 avoid responsive geometry | step 6 | Only nav width shrinks; radii + bar height stay fixed |
| #21 `flex-shrink: 0` on overflow-hidden rows | step 3 | TopRail gets explicit flex-shrink to prevent clipping |
| #22 child order for graceful degradation | steps 3,4 | Load-bearing chrome placed first/adjacent to scrollable children |
| #23 split interactive leaf vs wrapper | step 4 | Category rows = LcarsPanel (leaf), accordion = composition |
| #24 `ReactNode` slots don't enforce shape | steps 3,4 | Doc-comment expected child types; code-review before merge |

## Canonical grammar (the rules we're deviating from)

These are the non-negotiable LCARS-24.2 primitives as expressed in the
reference stylesheet:

1. **Left frame rail.** Two colored blocks (top + bottom) separated by a
   `.25rem solid black` seam. The top block ends in a large `--radius-top`
   (160px at base font) rounding at its **top-right** corner. The bottom
   block ends in `--radius-bottom` (100px) at its **bottom-right** corner.
   Text inside the rail is right-aligned, compressed uppercase, bold, black
   on colored fill.
2. **Elbow corner.** Where the left rail meets the top bar, a 60×60px
   diagonal-gradient pseudo-element joins them — `linear-gradient(to top
   right, var(--rail-color) 50%, black 50%)` — producing the signature
   "shoulder" shape.
3. **Segmented top bar.** A single horizontal band made of multiple colored
   segments (`.bar-1` → `.bar-10`) at non-uniform widths (e.g. 18% / 6%
   / 24% / 1fr / 9%), each separated by a `.25rem` black seam. Segments
   do NOT have rounded ends except for the first and last.
4. **Pill labels anchor bottom-right.** Every label inside a colored fill
   is flex-aligned to `justify-content: flex-end; align-items: flex-end`
   with `padding: .75rem .75rem .35rem 0`. The capital letters kiss the
   bottom-right corner.
5. **No gradients, no shadows inside bars.** Color fills are flat. The
   only "depth" is the black seam grammar.
6. **All rhythm is built on 0.25rem × N.** Seams, padding, and heights
   all snap to the `--lcars-spacing-panel-border` step.
7. **Type: compressed uppercase (Antonio / similar).** Wordmarks, pill
   labels, zone headers, and panel eyebrows all share the same family
   and are all uppercase; size is where hierarchy comes from.

## What the current shell gets right

- LcarsPill primitive shape, rounded variants, active/disabled states.
- Zone collapse restore stubs (nav / inspector / console) now land on the
  right colors and preserve the rail edge.
- Color tokens (`orange`, `african-violet`, `butterscotch`, `bluey`, `red`)
  exist in the theme and are pulled correctly.
- Three-zone grid layout proportionally matches the canonical frame.

## Gap list (what to fix)

### Structural (blocking — the shell does not read as LCARS without these)

G1. **No elbow corner** at the join of LeftNavigator's orange cap and the
    top rail. Today there is a 0.25rem black seam but no diagonal transition.
    Fix: add a `::before` pseudo-element on TopRail's left band (or a new
    dedicated `.elbowCorner` node spanning the grid's top-left cell) using
    the canonical `linear-gradient(to top right, <rail-color> 50%, black 50%)`.

G2. **TopRail is three pills, not a segmented bar.** The canonical grammar
    would render the top strip as one horizontal band of 5–7 colored
    segments separated by black seams, with the rightmost two segments
    reserved for state (active tool name) and controls (reset / palette /
    gallery). Fix: rebuild TopRail around `LcarsBar` with a segmented layout
    described below.

G3. **LeftNavigator doesn't honor the two-block + elbow shape.** Today it
    is: 64px orange cap + white-on-black content + bottom cap. The canonical
    shape is: *tall* top block (bluey or orange) with a 160px top-right
    corner radius, content that lives **inside** the colored fill, then
    a `.25rem` black seam, then a second colored block with its own
    bottom-right radius. Our current "white content between two pills"
    reads as a web sidebar, not an LCARS rail.

### Stylistic (high-value polish)

S1. **Category rows should read as panel-buttons, not pills.** In canonical
    LCARS the sidebar accordion is a stack of color-banded rows with their
    label right-aligned at the bottom and a thin black seam between them.
    Today each row is an LcarsPill inside a tabular container — too rounded,
    too floaty.

S2. **Favorites should be compact chips in a row, not a vertical list.**
    Matches canonical two-column pill grids. Frees vertical space for the
    category accordion which is where the tool count lives.

S3. **Section headers need the LCARS eyebrow treatment** — 0.7rem
    compressed uppercase, `letter-spacing: .24em`, flush-right numeric
    subscript (e.g. `FAVORITES · 02`).

S4. **Wordmark has no character.** "Hyperspanner · Starfleet Ops · v0.0"
    is readable but visually flat. Render it as a compressed-uppercase
    mark in the **inside of the colored rail block**, bottom-right anchored
    per the LCARS label rule.

## Target design (after polish)

```
┌── 48px top rail ──────────────────────────────────────────────────────┐
│                                                                       │
│  ORANGE │ VIOLET │ TOOL NAME  · HYPERSPANNER              │ ⎡⎤│⎡⎤│⎡⎤ │
│   240w  │  120w  │       stretch                          │ control  │
│                                                                       │
├──╲                                                                    │
│    ╲ elbow corner (60×60, diag gradient, rail-color → black)          │
│     ╲                                                                 │
│  ORANGE RAIL  ┃                                                       │
│  (160px top-  ┃        CENTER / SPLIT PANES                           │
│   right       ┃                                                       │
│   radius)     ┃                                                       │
│               ┃                                                       │
│   hyper       ┃                                                       │
│  SPANNER      ┃                                                       │
│  ─────────    ┃                                                       │
│  FAVORITES·02 ┃                                                       │
│  [JSON][HASH] ┃                                                       │
│  ─────────    ┃                                                       │
│  CATEGORIES·6 ┃                                                       │
│  ▸ TEXT & FMT ┃                                                       │
│  ▸ VALIDATION ┃                                                       │
│  …            ┃                                                       │
│               ┃                                                       │
│  VIOLET RAIL  ┃                                                       │
│  (100px bot-  ┃                                                       │
│   right       ┃                                                       │
│   radius)     ┃                                                       │
│               ┃                                                       │
└───────────────┴───────────────────────────────────────────────────────┘
```

## Sequenced work

Order matters — each step leaves the shell shippable if we stop there.

**Step 1 — Shell token layer.** The base LCARS tokens already exist in
`packages/lcars-ui/src/tokens` and are consumed by LcarsStandardLayout.
What's missing for AppShell is a small set of *shell-scoped* tokens that
lock the rail/bar/elbow into color sync (lesson #19). Add to
`apps/desktop/src/styles/global.css`:
   - `--shell-rail-top-color` — LeftNavigator top block color + TopRail
     leftmost segment color (same value, referenced in both)
   - `--shell-rail-bottom-color` — LeftNavigator bottom block color
   - `--shell-elbow-size: 60px` — elbow geometry (fixed, not responsive)
   - `--shell-nav-width: 240px` — rail width (matches leftmost top-bar
     segment width; only value that shrinks responsively)
*Exit criteria:* `pnpm typecheck` clean, shell still renders.

**Step 2 — Elbow corner at nav↔topRail join.** ~~New LcarsElbow
primitive.~~ *Superseded:* inline a radial-gradient elbow div in
AppShell.module.css at the grid cell spanning
`grid-area: nav` row 1 / `grid-area: top` col 1. Follow the
LcarsStandardLayout pattern (radial-gradient, 60×60, transparent disc
+ solid outer, 1px overlap with the bar to close sub-pixel seams).
No new component file. *Exit criteria:* elbow renders in all four
themes without stacking-context issues; collapse-to-stub still works.

**Step 3 — Segmented TopRail rebuild.** Replace the current 3-column grid
with `LcarsBar` + a pill controls cluster in a flex row. Bar segments:
   - Brand (color: `--shell-rail-top-color`, width: matches
     `--shell-nav-width`, label: "HYPERSPANNER" — rendered as an
     absolute-positioned label on top of the segment per LCARS grammar)
   - Elbow-down cap (60px wide, `--shell-rail-top-color` — this segment
     sits directly above where the elbow radial paints, lesson #19
     prevents a color flash at the seam)
   - Active tool eyebrow + title (butterscotch, 200px fixed) — compressed
     uppercase label with right-anchored wordmark
   - Main flex segment (african-violet, flex) — currently decorative;
     reserves visual real estate for Phase 4 tool telemetry readout
   - Controls host (butterscotch, auto) — LcarsPill cluster:
     `⌘K · PALETTE` / theme-cycle / `RESET` / `GALLERY` / `SCREENS`
*Exit criteria:* seams are black `--lcars-spacing-panel-border`;
rail-color invariant holds (verified by inspecting computed styles);
controls still call the same props (contract unchanged, lesson #24:
doc-comment the props to prevent shape drift).

**Step 4 — LeftNavigator two-block rebuild.** Split the rail into two
LcarsPanel blocks + a middle content region:
   - **Top cap (LcarsPanel)** — fills the top 64px of the rail,
     `color: var(--shell-rail-top-color)`, `seamless` so the elbow
     curve below blends cleanly (lesson #19). Contains the wordmark
     "HYPERSPANNER" right-anchored per LCARS grammar.
   - **Middle content** — flex column with:
     - Wordmark sub ("Starfleet Ops · v0.0") as a telemetry label
     - LcarsSearchField for filtering
     - Favorites row — compact pill cluster using LcarsTabCluster
       + LcarsTabPill (validated pattern from S5). Only 2 items today;
       LcarsPill row is fine. Section eyebrow "FAVORITES · 02".
     - Categories — vertical LcarsPanel stack following the S4
       pattern: one panel per category header (africanViolet), with
       the expanded tool list rendered as a nested LcarsPanel sub-stack
       in a lighter/darker shade. Active tool = `active` prop on the
       matching panel. Last panel in rail has `seamless` prop.
   - **Bottom cap (LcarsPanel)** — fills the bottom ~52px,
     `color: var(--shell-rail-bottom-color)` (africanViolet by
     default), `seamless`. Decorative; could host status telemetry
     in Phase 4.
Remove the custom `.elbowCap` / `.elbowCapBottom` CSS blocks — those
are replaced by the panels' natural color fills plus the Step 2 elbow.
*Exit criteria:* rail reads as canonical LCARS at 1440×900; the
elbow from Step 2 blends seamlessly into the top panel; collapse
stub still shows the orange cap.

**Step 5 — Typography pass.** Pull Antonio (or a free compressed
sans — Oswald / Barlow Condensed are acceptable) into the Tauri asset
bundle; set it as the LCARS font family. Audit every label in the shell
for `text-transform: uppercase` + `letter-spacing: .16–.24em`.
*Exit criteria:* consistent compressed uppercase across rail, top bar,
zone headers, and tab strips.

**Step 6 — Responsive reconciliation.** Canonical LCARS has breakpoints
at 1500 / 1300 / 950 / 750 / 525 / 450 px. Apply the same clamp-based
shrink to the new shell (bar height 28 → 24 → 20 → 16 → 10 px; rail
width 240 → 220 → 140 → 62 px; top/bottom radii scale proportionally).
*Exit criteria:* shell still reads as LCARS at narrow widths; collapse
stubs remain clickable.

## Risks / open questions

- **R1.** Replacing the three-pill TopRail with a segmented bar may break
  the TopRail props contract consumed by AppShell (`activeToolTitle`,
  `onResetLayout`, `onOpenPalette`, `onOpenGallery`). Mitigation: keep the
  contract intact; only the internal DOM and CSS change.
- **R2.** The bottom of the rail currently hosts a simple elbow cap
  (`.elbowCapBottom`). In the canonical design the cap is implied by the
  bottom-right radius on the lower colored block, so the separate cap
  should be deleted. Mitigation: confirm no consumers depend on the cap
  DOM node (they don't — it's purely decorative today).
- **R3.** Antonio is not licensed for redistribution; we'd either bundle
  a free compressed sans (Barlow Condensed / Oswald from Google Fonts)
  or leave `system-ui` in place. Recommend Barlow Condensed for Phase 4
  delivery — Apache 2.0 licensed.
- **R4.** Drag-to-split overlays need to survive the two-block rail
  restructure. Mitigation: PaneDropTarget is scoped to pane bodies, not
  the rail — unaffected.

## Non-goals for this plan

- Full canonical LCARS frame (5-column decorative frame around the whole
  viewport). That's a Phase 6+ look-and-feel pass, not a shell-fitness issue.
- Data cascade animation (`.data-cascade-wrapper`). Nice to have, lives on
  the console zone in Phase 5.
- Sound effects on clicks. Reserved for an accessibility toggle in Phase 9.

## Estimate

Roughly two focused passes on top of the current codebase (no new state,
no new store actions):
- Pass A (steps 1–3): ~4 files changed in `packages/lcars-ui` + TopRail.
- Pass B (steps 4–6): ~4 files in `apps/desktop/src/shell`.

No blocking dependency on outside services.
