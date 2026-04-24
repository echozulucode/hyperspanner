---
type: reference
project: "Hyperspanner"
status: active
updated: 2026-04-23
source_phase: "6.1"
source_tool: "json-validator"
---

# Tool Pattern

The shape every Hyperspanner tool follows. Established by Phase 6.1
(`apps/desktop/src/tools/json-validator/`) and carried by the remaining
twelve tools in sub-phases 6.2–6.5.

## Goal

A new tool ships in three hours, not three days, because the scaffolding
is settled. A reader of one tool already knows how every other tool is
laid out.

## Shape

```
apps/desktop/src/tools/<tool-id>/
├── <Tool>.tsx             — React component (UI only; no business logic)
├── <Tool>.module.css      — scoped styles
├── <Tool>.test.tsx        — component-level tests (jsdom, testing-library)
├── lib.ts                 — PURE functions (no React, no Tauri, no stores)
├── lib.test.ts            — exhaustive tests for lib (node env, fast)
└── index.ts               — barrel: component + useful lib exports
```

Shared scaffolding sits one level up at `apps/desktop/src/tools/components/`:

- `ToolFrame` — standard header/body/footer chrome; zone-responsive
  (compact in `right` / `bottom`, full in `center`).
- `ToolStatusPill` — four-color semantic pill (ok/error/warn/neutral).

Registry entry lives in `apps/desktop/src/tools/registry.ts`. A tool is
"shipped" when its registry entry's `component` field points at the real
component instead of `PlaceholderTool`.

## Rules of the road

### 1. The component knows about React. `lib.ts` doesn't.

`lib.ts` exports pure functions that take plain values and return plain
values (or discriminated-union result types). No hooks, no Tauri, no
store imports, no DOM APIs. This lets:

- `lib.test.ts` run under the `node` env (fast — no jsdom startup).
- A future backend-accelerated path swap the pure function for a Tauri
  command without changing the component.
- A CLI mode, a scripted bulk-operation mode, or a test harness reuse
  the same logic without dragging React in.

The test for this rule is: "could a web worker import `lib.ts`?" If not,
something leaked.

### 2. Errors are discriminated unions, not exceptions.

`lib.ts` functions that can fail return
`{ kind: 'ok'; ... } | { kind: 'error'; ... } | { kind: 'empty' }`
(empty is specifically for "no input yet" — don't surface a parse error
when the user hasn't typed anything). Throwing is reserved for programmer
bugs.

The UI consumes results by switching on `kind`. Never write
`try { fn() } catch { ... }` around tool-lib calls — if you feel the
urge, fix the function signature instead.

### 3. State lives in `useTool`, not `useState`.

`useTool<T>(toolId, defaults)` gives the tool a runtime slot keyed by tool
id. Benefits:

- Tab-switching inside the workspace preserves the tool's state — React
  only mounts the active tab, but the store keeps every tool's buffer.
- Closing a tool clears the slot automatically (see `clearToolState`).
- A tool gets the same slot whether it's in the center, the inspector,
  or the bottom console — no surprise resets when the user drags it.
- Phase 7 will swap the backing storage for the Tauri app-data-dir
  projection without touching tool code.

What goes in the slot: editor buffers, view-mode toggles, user
preferences that should persist across a tab switch but not across a
session. What doesn't: derived values (recompute them per render — use
`useMemo` if the recomputation is actually expensive).

### 4. Zone-responsive layout is a render-time decision.

Tools that can dock into `right` (inspector) or `bottom` (console)
receive a `zone` prop. The compact form is not a separate component —
same tree, different class modifiers. This keeps React state and DOM
identity stable when the user drags the tab between docks, so the
editor caret doesn't jump and textarea scroll position survives.

Rule of thumb for compact forms:

- Drop the subtitle (header gets tighter).
- Drop non-essential action pills (keep Format/Minify, drop Indent toggle).
- Shrink font and padding.
- Truncate labels rather than wrap.

If a tool fundamentally can't compact (e.g. Hex Inspector, where 16
bytes of hex is the format), set `supportedZones: ['center']` in the
registry so the inspector dock is refused at move time rather than
rendered unreadably.

### 5. Filesystem / network / crypto go through `@/ipc`.

Anything touching the OS goes through the typed wrappers in
`apps/desktop/src/ipc/`. Never import `@tauri-apps/api/core` directly
from a tool. Benefits:

- Every command failure arrives as a typed `HyperspannerError` with a
  string-literal `kind` for the UI to switch on — no string-parsing
  error messages.
- The transport is mockable in unit tests (`__setInvokeForTests`).
- Any cross-cutting concern (tracing, rate-limiting, cancellation)
  plumbs into one place.

If a tool needs a command that doesn't exist yet, add it in the
appropriate Rust sub-module (`apps/desktop/src-tauri/src/commands/`),
register it in `lib.rs`, and add a typed wrapper in
`apps/desktop/src/ipc/`. See `docs/plan.md` Phase 6.0 for the
contract.

### 6. Tests come in two layers.

- `lib.test.ts` — dozens of cases, runs in node env, fast. This is
  where edge cases, error shapes, round-trip invariants, and fuzz-ish
  input live. The JSON Validator lib test exercises 20+ paths in
  well under 500ms.
- `<Tool>.test.tsx` — a handful of integration cases under jsdom with
  `@testing-library/react`. Covers state transitions (empty → valid →
  error), button-enabled states, keyboard interactions, zone
  responsiveness. Not exhaustive — the lib tests own "does the logic
  work"; the component tests own "does the UI wire up right".

Use plain `vitest` matchers (`expect(x).toBe(y)`, `expect(el).not.toBeNull()`).
We don't ship `@testing-library/jest-dom` yet; `screen.getByText` throws
when missing, which is the same assertion `toBeInTheDocument` gives you.

## JSON Validator as the reference implementation

File-by-file, what each piece does:

| File | Role |
|------|------|
| `lib.ts` | `validateJson`, `formatJson`, `minifyJson`, `lineColFromOffset`, `byteLength`. All pure, all discriminated-union results. |
| `lib.test.ts` | 20+ cases covering happy paths, whitespace collapse, error normalization, indent clamping, round-trip offset math, UTF-8 byte counting. |
| `JsonValidator.tsx` | Wraps `ToolFrame` with a textarea body and an action cluster (Format / Minify / Indent / Sample/Clear). Status footer renders `ToolStatusPill` driven by the memoized `validateJson` result. |
| `JsonValidator.module.css` | Monospace editor, focus ring in LCARS orange, compact-variant tightening. |
| `JsonValidator.test.tsx` | 7 integration cases — initial idle state, valid/invalid transitions, Format button end-to-end, disabled states on invalid input, Sample/Clear swap. |
| `index.ts` | Exports `JsonValidator` + the useful `lib` functions (other tools may want them, e.g. a future JSON ↔ YAML bridge in YAML Validator). |

## Checklist for a new tool

When adding a tool in a later sub-phase, follow this order:

1. Create the folder under `apps/desktop/src/tools/<tool-id>/`.
2. Write `lib.ts` with pure functions and a discriminated-union result type.
3. Write `lib.test.ts` and get it green in node env.
4. Write the component on top of `ToolFrame`. Think about zone
   responsiveness from the start — don't retrofit.
5. Write `<Tool>.test.tsx` covering state transitions and the disabled-
   button states.
6. Add an `index.ts` barrel.
7. Swap `PlaceholderTool` for the real component in
   `apps/desktop/src/tools/registry.ts`; refine the `description` and
   `supportedZones` while you're in there.
8. If the tool needs filesystem/network/crypto, add the command under
   `apps/desktop/src-tauri/src/commands/` + a typed wrapper in
   `apps/desktop/src/ipc/`. Don't plumb a tool's logic through a bespoke
   IPC path.
9. Run `pnpm --filter @hyperspanner/desktop typecheck && pnpm --filter @hyperspanner/desktop test` before committing.

## Anti-patterns

**Don't** put the editor buffer in `useState`. It won't survive a tab
switch, and the user will lose their input the first time they dock the
tool into the inspector.

**Don't** put logic inside the component. If the component file is
longer than 250 lines, something that belongs in `lib.ts` has leaked up.

**Don't** throw from `lib.ts`. Return an `{ kind: 'error' }` result.

**Don't** import `@tauri-apps/api` from a tool. Go through `@/ipc`.

**Don't** create a new LCARS primitive just for one tool. Compose from
what's in `@hyperspanner/lcars-ui`; if you need a new primitive, that's
a separate, reviewed decision — see the primitive-gallery gate.

**Don't** hand-roll status icons. Use `ToolStatusPill` with its four
semantic states. Adding a fifth state is a design decision, not a per-
tool call.
