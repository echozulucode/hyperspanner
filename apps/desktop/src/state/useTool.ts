import { useCallback } from 'react';
import { create } from 'zustand';

/**
 * useTool — per-tool runtime state slot.
 *
 * Tools need somewhere to park their own state (editor buffers, view mode,
 * history) that:
 *   - survives a tab getting deactivated but not closed
 *   - resets cleanly on close
 *   - doesn't pollute the workspace store
 *
 * The store holds a `Record<toolId, unknown>` and exposes a typed hook
 * that returns `[state, setState]` with `setState` accepting a partial
 * merge or a function. Each tool provides its own default state the
 * first time it's read.
 *
 * Phase 3 scope: in-memory only. Phase 7 adds per-tool persistence through
 * the Tauri app-data-dir projection.
 */

interface ToolStateStore {
  byId: Record<string, unknown>;
  set: (id: string, value: unknown) => void;
  reset: (id: string) => void;
  has: (id: string) => boolean;
}

const useToolStateStore = create<ToolStateStore>()((setState, get) => ({
  byId: {},
  set: (id, value) =>
    setState((prev) => ({ byId: { ...prev.byId, [id]: value } })),
  reset: (id) =>
    setState((prev) => {
      const next = { ...prev.byId };
      delete next[id];
      return { byId: next };
    }),
  has: (id) => Object.prototype.hasOwnProperty.call(get().byId, id),
}));

export interface UseToolReturn<T> {
  state: T;
  setState: (patch: Partial<T> | ((prev: T) => T)) => void;
  reset: () => void;
}

/**
 * Read/write the runtime state slot for a tool.
 *
 * @param id      stable tool id (matches the registry key)
 * @param defaults default state — used on the first read and on `reset()`
 */
export function useTool<T extends object>(id: string, defaults: T): UseToolReturn<T> {
  const raw = useToolStateStore((s) => s.byId[id]) as T | undefined;
  const storeSet = useToolStateStore((s) => s.set);
  const storeReset = useToolStateStore((s) => s.reset);

  const state = (raw ?? defaults) as T;

  const setState = useCallback(
    (patch: Partial<T> | ((prev: T) => T)) => {
      // Read the current slot synchronously from the store so that multiple
      // setState calls batched inside a single render (e.g. two
      // `setState(prev => …)` calls inside one act()) each see the result of
      // the previous call instead of the stale closure snapshot.
      const live = useToolStateStore.getState().byId[id] as T | undefined;
      const prev = (live ?? defaults) as T;
      const next =
        typeof patch === 'function'
          ? (patch as (p: T) => T)(prev)
          : ({ ...prev, ...patch } as T);
      storeSet(id, next);
    },
    [id, defaults, storeSet],
  );

  const reset = useCallback(() => {
    storeReset(id);
  }, [id, storeReset]);

  return { state, setState, reset };
}

/** Escape hatch for the workspace store — clears a tool's state when it's closed. */
export function clearToolState(id: string): void {
  useToolStateStore.getState().reset(id);
}
