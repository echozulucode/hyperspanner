// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useFavorites,
  useIsFavorite,
  useToggleFavorite,
  toggleFavorite,
  clearAllFavorites,
  useFavoritesStore,
} from './useFavorites';

/**
 * useFavorites — cover:
 *   - initial empty list
 *   - toggle adds and removes; readd lands at the front
 *   - membership selector flips correctly
 *   - imperative toggleFavorite() mirrors the hook action
 *   - persistence round-trip (localStorage write + read back)
 */

beforeEach(() => {
  // Clean slate per test. localStorage is also cleared so the persist
  // middleware doesn't rehydrate state between tests.
  localStorage.clear();
  clearAllFavorites();
});

describe('useFavorites', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current).toEqual([]);
  });

  it('toggle adds then removes an id', () => {
    const list = renderHook(() => useFavorites());
    const toggle = renderHook(() => useToggleFavorite());

    act(() => {
      toggle.result.current('json-validator');
    });
    expect(list.result.current).toEqual(['json-validator']);

    act(() => {
      toggle.result.current('json-validator');
    });
    expect(list.result.current).toEqual([]);
  });

  it('re-favoriting after removal lands the id at the front', () => {
    const list = renderHook(() => useFavorites());
    const toggle = renderHook(() => useToggleFavorite());

    act(() => {
      toggle.result.current('a');
      toggle.result.current('b');
      toggle.result.current('c');
    });
    // Pin order is most-recent-first
    expect(list.result.current).toEqual(['c', 'b', 'a']);

    act(() => {
      toggle.result.current('a'); // remove
      toggle.result.current('a'); // re-add
    });
    expect(list.result.current).toEqual(['a', 'c', 'b']);
  });

  it('useIsFavorite flips on toggle', () => {
    const isFav = renderHook(() => useIsFavorite('json-validator'));
    expect(isFav.result.current).toBe(false);

    act(() => {
      useFavoritesStore.getState().toggleFavorite('json-validator');
    });
    expect(isFav.result.current).toBe(true);

    act(() => {
      useFavoritesStore.getState().toggleFavorite('json-validator');
    });
    expect(isFav.result.current).toBe(false);
  });

  it('imperative toggleFavorite() matches the hook action', () => {
    const list = renderHook(() => useFavorites());
    act(() => {
      toggleFavorite('hex-inspector');
    });
    expect(list.result.current).toEqual(['hex-inspector']);
  });

  it('persists to localStorage with the expected key', () => {
    act(() => {
      toggleFavorite('regex-tester');
    });
    const raw = localStorage.getItem('hyperspanner/favorites/v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    // Zustand persist wraps state in { state, version }
    expect(parsed.state.ids).toEqual(['regex-tester']);
  });
});
