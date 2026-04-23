import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * useFavorites — stable list of favorited tool ids.
 *
 * Backed by a Zustand store with localStorage persistence (per plan-002
 * Phase 4). Phase 7 will swap the storage engine for the Tauri app-data
 * projection, but the public API here stays stable.
 *
 * Favorites are stored as a string[] rather than a Set because:
 *   1. JSON persistence serializes arrays trivially; Sets need custom
 *      replacer/reviver glue.
 *   2. The consumer (LeftNavigator, HomeView) wants a stable iteration
 *      order for rendering — ordering by when the tool was favorited
 *      gives "pinned to top in the order I pinned them," which reads
 *      more natural than alphabetical or id-sorted.
 *
 * The `Set<string>` shape is reconstructed only inside membership checks,
 * which are O(1) once built. For the 13-tool registry the difference is
 * academic, but the pattern scales cleanly if the registry grows.
 */

interface FavoritesState {
  /** Tool ids in favorite order — most recently favorited first. */
  ids: string[];
  toggleFavorite: (id: string) => void;
  /** Remove a favorite unconditionally. Used when a tool is removed from
   *  the registry so a dangling id doesn't keep rendering a broken row. */
  removeFavorite: (id: string) => void;
  /** Replace the entire list. Used by tests and the reset-layout flow. */
  setFavorites: (ids: readonly string[]) => void;
}

const STORAGE_KEY = 'hyperspanner/favorites/v1';

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggleFavorite: (id) =>
        set((prev) => {
          const exists = prev.ids.includes(id);
          if (exists) {
            return { ids: prev.ids.filter((x) => x !== id) };
          }
          // New favorites land at the TOP so "most recently favorited" reads
          // first — matches the mental model of pinning.
          return { ids: [id, ...prev.ids] };
        }),
      removeFavorite: (id) =>
        set((prev) => ({ ids: prev.ids.filter((x) => x !== id) })),
      setFavorites: (ids) => set({ ids: [...ids] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/**
 * Read the ordered favorite list. Re-renders only when the list changes,
 * not when unrelated store updates fire.
 */
export function useFavorites(): readonly string[] {
  return useFavoritesStore((s) => s.ids);
}

/**
 * Read a single id's membership. O(n) in list length per call, but the
 * component only re-renders when the specific-id membership flips — the
 * selector returns a boolean primitive, so Zustand's default shallow
 * equality treats unrelated list edits as no-ops.
 */
export function useIsFavorite(id: string): boolean {
  return useFavoritesStore((s) => s.ids.includes(id));
}

/**
 * Stable action reference. Grabbing the action out of the store via a
 * selector gives React a stable identity to hand to effect dependency
 * arrays and memoized callbacks.
 */
export function useToggleFavorite(): (id: string) => void {
  return useFavoritesStore((s) => s.toggleFavorite);
}

/**
 * Imperative toggle — for call sites that aren't React components
 * (command palette executor, keyboard handlers). Uses the store's
 * escape-hatch `getState()`.
 */
export function toggleFavorite(id: string): void {
  useFavoritesStore.getState().toggleFavorite(id);
}

/** Imperative remove — symmetric to `clearToolState()` for the workspace. */
export function removeFavorite(id: string): void {
  useFavoritesStore.getState().removeFavorite(id);
}

/** Test helper — nukes the whole list. */
export function clearAllFavorites(): void {
  useFavoritesStore.getState().setFavorites([]);
}
