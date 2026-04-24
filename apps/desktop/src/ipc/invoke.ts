/**
 * Typed wrapper around `@tauri-apps/api/core`'s `invoke`.
 *
 * Two things this adds on top of the raw Tauri call:
 *   1. Error normalization — any rejection is routed through
 *      `toHyperspannerError` so callers handle a single typed exception.
 *   2. A lazy-imported transport seam — the tauri invoke function is
 *      imported at call time rather than module load time. This lets
 *      unit tests (Vitest, running in jsdom without Tauri's WebView)
 *      swap the transport via `__setInvokeForTests` without mocking the
 *      bundler. Production bundles still get tree-shaken to a single
 *      direct `invoke` call — the seam is a function pointer, not a
 *      configuration object.
 *
 * Every concrete command wrapper lives next door (e.g. `./fs.ts`) and
 * imports `invoke` from this file, not from `@tauri-apps/api` directly.
 * The barrel `./index.ts` re-exports the typed wrappers; UI code should
 * never touch `@tauri-apps/api/core` itself.
 */

import { toHyperspannerError } from './errors';

/**
 * Shape of Tauri's `invoke` — narrow enough to type our seam but not
 * dependent on importing the real module at type-checking time.
 */
export type InvokeFn = <T>(
  cmd: string,
  args?: Record<string, unknown>,
) => Promise<T>;

let transport: InvokeFn | null = null;

/**
 * Resolve the transport function. The first real call loads `@tauri-apps/api/core`
 * dynamically; subsequent calls reuse the cached reference. Tests that
 * prefer a synchronous seam can call `__setInvokeForTests` before the
 * first invoke.
 *
 * We prefer dynamic import over top-level import so Vitest doesn't try to
 * resolve `@tauri-apps/api/core` in environments that don't have the
 * Tauri runtime (CI, unit tests). The import only fires on real IPC
 * calls in integration tests or in the actual app.
 */
async function getTransport(): Promise<InvokeFn> {
  if (transport) return transport;
  const mod = (await import('@tauri-apps/api/core')) as {
    invoke: InvokeFn;
  };
  transport = mod.invoke;
  return transport;
}

/**
 * Invoke a Tauri command by name. Rejections are normalized to
 * `HyperspannerError` so callers need only one catch arm.
 *
 * The generic `T` is the success type — this is where command wrappers
 * enforce the shape of Rust's response. Since Tauri IPC doesn't validate
 * the TS side of the contract, mismatches here are silent; keep the
 * wrappers in `./fs.ts` et al. aligned with Rust's serde output.
 */
export async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    const fn = await getTransport();
    return await fn<T>(cmd, args);
  } catch (raw) {
    throw toHyperspannerError(raw);
  }
}

/**
 * Override the invoke transport. Intended for unit tests only — wrap the
 * export in `__` to discourage production usage. Pass `null` to reset
 * back to the lazy-loaded default.
 */
export function __setInvokeForTests(fn: InvokeFn | null): void {
  transport = fn;
}
