---
type: plan
id: plan-006
title: De-risk screens + expanded component gallery
status: proposed
owner: hyperspanner
created: 2026-04-20
updated: 2026-04-20
---

# Plan 006 — De-risk screens + expanded gallery

## Why

Iterating on the real `AppShell` is slow: every visual tweak requires
pushing through workspace state, descriptor lookups, and the drag/drop
overlay. **De-risk screens** sidestep that entirely — each one is a
single-purpose full-viewport composition that renders canonical LCARS
patterns with zero state plumbing. The goal is to nail the visual
grammar in isolation, *then* graduate the winning patterns into real
primitives and into `AppShell`.

The immediate trigger: user shared a reference screenshot (the "HOME
AUTOMATION" LCARS dashboard — Star Date 2701.16, with the canonical
left rail of colored panel-buttons, elbow corner, segmented top bar,
tab pill cluster, event log, and trajectory inset). The current shell
doesn't look like that. We need a place to iterate on "does it look
like that yet?" without wrestling the app.

This plan covers two linked deliverables:

**A.** A `/screens` hub with one de-risk screen per LCARS pattern,
plus a pixel-compare view where a reference image sits next to our
implementation at the same viewport size.

**B.** Gallery expansion — new primitives that emerge from the de-risk
screens once a pattern proves out (elbow corner, panel-button, star-date
readout, wireframe inset, event-log readout).

## Route layout

Extend the hash router (which currently only knows `gallery` vs the
shell) to support one-level paths:

| Hash                          | Renders                                    |
| ----------------------------- | ------------------------------------------ |
| `#/gallery`                   | PrimitiveGallery (existing)                |
| `#/screens`                   | ScreensHub — link grid to every screen     |
| `#/screens/home-automation`   | Reference-replica screen (user's image)    |
| `#/screens/rail-elbow`        | Left rail + top bar elbow in isolation     |
| `#/screens/segmented-top`     | Top bar segmented-bar pattern              |
| `#/screens/panel-button-stack`| Vertical LIGHTS / CAMERAS / ENERGY stack   |
| `#/screens/tab-cluster`       | SENSORS / GUAGES / WEATHER tab pills       |
| `#/screens/trajectory-inset`  | Bordered mini-display with wireframe       |
| `#/screens/event-log`         | Compressed-uppercase event log readout     |
| `#/screens/compare/<name>`    | Side-by-side reference image + our impl    |

Every screen has a `← SCREENS` pill at the top-left that navigates back
to the hub, and a `← SHELL` pill that returns to the real app. That
keeps navigation predictable even from full-bleed layouts.

## Screen catalog (phase order)

Each screen is shippable in isolation. We build them in this order
because each later one reuses primitives extracted from the earlier
ones.

### S1 — Home Automation reference replica
**Goal:** replicate the user's reference image as closely as possible
using current primitives and hand-written CSS. This is the
"does the grammar hold together at all" test. Anything that needs a
new primitive gets built inline here first; if it proves out, we
extract it (see deliverable B).

**What's on screen:**
- Top bar: `[ LCARS 105 ]` pill · `HOME AUTOMATION` title band · 
  `STAR DATE 2701.16 09:04:24` readout · `[ LOGOUT ]` pill
- Left rail: elbow at top-left · three panel-buttons (`LIGHTS`,
  `CAMERAS` with active highlight, `ENERGY`) · bottom-right radius cap
- Center: tab pill cluster (`SENSORS / GUAGES / WEATHER`) · event log
  readout with four lines of compressed uppercase telemetry
- Bottom-right: trajectory inset with wireframe + bulkhead code
- Bottom bar: segmented footer with `SEARCH` / `LIBRARY` pills + IP code

### S2 — Rail + elbow in isolation
Just the left rail with the diagonal elbow corner (60×60 gradient) at
the join with a stub top bar. Used to verify the elbow primitive at
every theme + viewport width. No content, just structure.

### S3 — Segmented top bar
A full-width `LcarsBar` with 5–7 segments at canonical proportions
(brand 18% / elbow cap 4% / title flex / state 8rem / controls 14rem).
Used to verify segment widths, seam thickness, and the interaction
between the elbow cap segment and the rail below it.

### S4 — Panel-button stack
A vertical stack of colored rectangular buttons with right-anchored
labels — the `LIGHTS / CAMERAS / ENERGY` pattern. Used to verify the
difference between a pill (fully rounded) and a panel-button (flat
rectangular with label at bottom-right). The active state gets the
orange fill as in the reference.

### S5 — Tab cluster
A horizontal row of pill-shaped tabs (SENSORS / GUAGES / WEATHER in
the reference). The active tab gets orange; the others get
african-violet. Seams between them are flat black. Used to pressure-
test whether our current `LcarsPill` can compose into this cluster
or whether we need a dedicated `LcarsTabCluster` primitive.

### S6 — Trajectory inset
A bordered mini-panel containing an SVG wireframe, a data code label
in the top-right (`2374-02-1`), and a data-cascade-style footer. Used
to verify that our primitives can host arbitrary content (SVG, canvas)
without breaking the LCARS grammar at the edges.

### S7 — Event log readout
Full-bleed compressed-uppercase text block (`2 ALARM ZONES TRIGGERED`
/ `14.3 kWh USED YESTERDAY` / etc.). Used to verify typography —
specifically, whether Barlow Condensed (our candidate font) reads right
at the sizes shown in the reference.

### S-Compare — Reference vs impl
For each screen, an optional `/compare/<name>` variant that places the
reference screenshot in one half of the viewport and our implementation
in the other half, at the same CSS pixel size. Lets us A/B visually
at a glance. The reference image lives under
`apps/desktop/public/reference-images/<name>.png`.

## Gallery expansion (deliverable B)

The PrimitiveGallery grows three new sections as screens prove out
their primitives:

### New primitive candidates

Each of these should emerge from a de-risk screen, not be invented
up-front:

1. **`LcarsElbow`** — 60×60 (responsive) diagonal-gradient corner piece.
   Props: `color`, `orientation: 'tl' | 'tr' | 'bl' | 'br'`, `size`.
   Emerges from S2.

2. **`LcarsPanelButton`** — flat rectangular button with right-anchored
   label. Distinct from `LcarsPill` (which is rounded). Props: `color`,
   `active`, `onClick`, `children`, `size`. Emerges from S4.

3. **`LcarsStarDate`** — compressed-uppercase star date + time readout
   with the canonical `STAR DATE 2701.16 09:04:24` format. Props:
   `value` (Date), `tick?: boolean`. Emerges from S1.

4. **`LcarsTabCluster`** — row of pill tabs with the active one filled
   orange. Different semantics from the current shell tab strip
   (no close buttons, no drag, no overflow — pure display). Emerges
   from S5.

5. **`LcarsEventLog`** — vertically stacked compressed-uppercase text
   lines with optional severity color on the numeric prefix. Emerges
   from S7.

6. **`LcarsWireframeInset`** — bordered panel with header eyebrow,
   slot for SVG/canvas, and a footer data line. Emerges from S6.

### Gallery sections to add

After the primitives land, add to `PrimitiveGallery`:

- **Elbows + rails** — all four elbow orientations + rail caps in a grid.
- **Panel buttons vs pills** — side-by-side variants so the difference
  is obvious.
- **Tab clusters** — the new `LcarsTabCluster` at 2 / 3 / 5 tab counts.
- **Event logs + star dates** — typography showcase at multiple sizes.
- **Reference screenshots** — an index of which reference image each
  primitive was derived from, with a direct link to the de-risk screen.

## Execution sequence

Each task is independently shippable; stopping partway leaves a usable
shell + the de-risk screens built so far.

**T1 — Router + hub.** Extend `useHashRoute` to match `startsWith`
for `screens/` paths. Build `ScreensHub` page with link grid to each
screen. Wire into `App.tsx` alongside the existing gallery route.
*Exit:* `#/screens` renders a hub with disabled links to screens that
haven't been built yet.

**T2 — Screen S1 (Home Automation replica).** Build the reference
replica using current primitives + inline CSS. Capture one screenshot
of the reference image into `apps/desktop/public/reference-images/
home-automation.png`. Done when it looks visually close to the
reference at 1400×800.

**T3 — Compare view.** Build `ScreensCompare` that takes a screen name
and renders `<img src="reference-images/<name>.png">` + the live screen
in a split layout. Add one nav link in `ScreensHub`.

**T4 — Extract primitives from S1.** Pull `LcarsElbow`, `LcarsPanelButton`,
`LcarsStarDate` out of the S1 impl into `packages/lcars-ui`. S1 then
reuses them (no visual change). Add gallery entries.

**T5 — Screens S2–S4.** Each screen is ~30 minutes with the new
primitives. Build, compare, refine. Each screen also adds a gallery
entry showing the primitive at multiple configurations.

**T6 — Screens S5–S7.** Same loop for tab cluster, trajectory inset,
event log. By the end we have all de-risk screens, all new primitives,
and gallery coverage for every one.

**T7 — Graduate to AppShell.** Rebuild `LeftNavigator` and `TopRail` to
use the primitives that proved out in de-risk screens. This is where
plan-005 meets plan-006: plan-005 described *what* the shell should
look like; plan-006 provides the primitives it needs.

## Why this order

The user's feedback was visual, so the answer has to be visual fast.
A de-risk screen is ~30 minutes of work and gives an honest read on
whether our primitives can produce the reference look. If they can't,
we discover which primitives are missing and build them in isolation
(gallery) rather than inside `AppShell` (where state makes iteration
expensive).

By the time we rebuild `AppShell` (plan-005 T4: LeftNavigator two-block
rebuild), every piece has already been validated in a de-risk screen
and shown in the gallery at multiple configurations. The AppShell
rebuild becomes assembly, not invention.

## Risks / open questions

- **R1.** The reference image uses `Antonio` (compressed uppercase
  sans). Our candidate is Barlow Condensed (Apache 2.0). Screen S7 is
  specifically where we verify that Barlow reads right. If not,
  fallback is Oswald.
- **R2.** SVG wireframe inset (S6) needs a tiny Enterprise-ish line
  drawing. We'll hand-author one; if drawing it is a time sink, use a
  simplified placeholder rectangle with grid lines.
- **R3.** Reference screenshot licensing. The LCARS-24.2 reference
  image the user shared appears to be a fan dashboard. We'll use it
  only inside the dev-only `#/screens/compare/*` view, never in the
  shipped binary — guarded by a Vite env flag.
- **R4.** The hash router (`useHashRoute`) is a Phase 2 minimal
  implementation. Extending it to a single-level `startsWith` match
  is trivial; a full router lands in Phase 5. No need to swap
  libraries now.

## Non-goals

- Animations beyond the data-cascade keyframe hint. Motion pass is
  Phase 9.
- Sound effects. Reserved for accessibility toggle, Phase 9.
- Theme-switcher inside screens (screens just use the current theme).
- Keyboard navigation between screens (arrow-key hub nav) — the hub
  is click-only for now.

## Estimate

T1 + T2 as one session (about 45 minutes) to validate the route +
land the first screen. Everything else incrementally.
