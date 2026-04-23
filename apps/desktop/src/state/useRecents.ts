import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * useRecents — most-recently-opened tool list, capped at RECENTS_CAP.
 *
 * Backed by a Zustand store with localStorage persistence. Each call to
 * `trackOpen(id)` moves the id to the front, de-duplicating and truncating.
 *
 * Why a separate hook rather than inlining this into the workspace store:
 * the workspace is session state (tools open RIGHT NOW), and recents is
 * historical (tools opened over time). Mixing them would mean clearing
 * the workspace also clears history, which is user-hostile. They happen
 * to correlate but aren't the same concept.
 *
 * Phase 7 will swap the storage engine for Tauri app-data persistence;
 * the public API here stays stable.
 */

export const RECENTS_CAP = 10;

interface RecentsState {
  /** Ids in most-recent-first order, capped at RECENTS_CAP. */
  ids: string[];
  trackOpen: (id: string) => void;
  /** Remove a specific id — used when a tool is removed from the registry. */
  forget: (id: string) => void;
  /** Wipe history. Exposed for tests and a future "clear recents" menu. */
  clear: () => void;
}

const STORAGE_KEY = 'hyperspanner/recents/v1';

export const useRecentsStore = create<RecentsState>()(
  persist(
    (set) => ({
      ids: [],
      trackOpen: (id) =>
        set((prev) => {
          // Remove any existing occurrence (so the id moves to front
          // rather than appearing twice), prepend, then cap.
          const without = prev.ids.filter((x) => x !== id);
          const next = [id, ...without].slice(0, RECENTS_CAP);
          return { ids: next };
        }),
      forget: (id) =>
        set((prev) => ({ ids: prev.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/** Read the ordered recents list. */
export function useRecents(): readonly string[] {
  return useRecentsStore((s) => s.ids);
}

/** Stable action reference for React call sites. */
export function useTrackOpen(): (id: string) => void {
  return useRecentsStore((s) => s.trackOpen);
}

/** Imperative track — for non-React call sites (store subscriptions,
 *  command palette executor). */
export function trackOpen(id: string): void {
  useRecentsStore.getState().trackOpen(id);
}

/** Imperative forget — for registry-cleanup paths. */
export function forgetRecent(id: string): void {
  useRecentsStore.getState().forget(id);
}

/** Test helper / user-facing "clear history" action. */
export function clearRecents(): void {
  useRecentsStore.getState().clear();
}
