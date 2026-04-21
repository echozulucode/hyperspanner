---
type: plan
id: plan-005
title: LCARS-24.2 polish — LeftNavigator + TopRail + shell seams
status: proposed
owner: hyperspanner
created: 2026-04-20
updated: 2026-04-20
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

**Step 1 — Token layer (shared).** Add to `packages/lcars-ui/src/tokens`:
`--lcars-radius-top: 160px`, `--lcars-radius-bottom: 100px`,
`--lcars-bar-height: 28px`, `--lcars-seam: 0.25rem solid black`,
`--lcars-rail-width: 240px`. Wire these into the theme's CSS custom
properties block so all shell CSS can reference them. *Exit criteria:*
`pnpm typecheck` clean, `PrimitiveGallery` still renders.

**Step 2 — Elbow corner primitive.** New `LcarsElbow` primitive in
`packages/lcars-ui`: accepts `color` prop, renders the 60×60 diagonal-
gradient corner with the right-rounded outer edge. Export from barrel.
Add a gallery entry. *Exit criteria:* renders in isolation with each
theme color; PrimitiveGallery shows all four orientations.

**Step 3 — Segmented TopRail rebuild.** Replace the current 3-column grid
with a `LcarsBar` containing 5 segments:
   - Brand (orange, 240px fixed, matches rail width so the elbow lines up)
   - Elbow-down cap (60px, diagonal gradient, serves as the top edge of
     the elbow primitive — same color as brand, transitioning to black)
   - Active tool title (african-violet, flex: 1, right-anchored label)
   - State readout (bluey, 8rem fixed, e.g. "ONLINE · CTR-00")
   - Controls cluster (butterscotch, 14rem fixed, pills for reset/palette/gallery)
*Exit criteria:* seams are black, labels are compressed uppercase,
controls still call the same props.

**Step 4 — LeftNavigator two-block rebuild.** Split the rail into two
panels:
   - **Upper (orange)** — fills ~62% of the rail height, contains the
     wordmark + search + favorites chip row. Background is orange; text
     is black; `border-top-right-radius: var(--lcars-radius-top)`.
   - **Lower (african-violet)** — fills the remainder, contains the
     category accordion. `border-bottom-right-radius:
     var(--lcars-radius-bottom)`.
   - Seam between them is `var(--lcars-seam)`.
Rework pill rows as panel-button rows (flat rectangular, black seams,
right-anchored labels). *Exit criteria:* rail reads as canonical LCARS
at `1440×900`; collapse-to-stub still works and the stub inherits the
orange cap.

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
