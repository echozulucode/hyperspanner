// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  RECENTS_CAP,
  useRecents,
  useTrackOpen,
  trackOpen,
  clearRecents,
  useRecentsStore,
} from './useRecents';

/**
 * useRecents — cover:
 *   - initial empty list
 *   - trackOpen prepends, dedupes, caps at RECENTS_CAP
 *   - forget() removes a specific id
 *   - clear() wipes the list
 *   - persistence round-trip
 */

beforeEach(() => {
  localStorage.clear();
  clearRecents();
});

describe('useRecents', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useRecents());
    expect(result.current).toEqual([]);
  });

  it('trackOpen prepends most-recent-first', () => {
    const list = renderHook(() => useRecents());
    const track = renderHook(() => useTrackOpen());
    act(() => {
      track.result.current('a');
      track.result.current('b');
      track.result.current('c');
    });
    expect(list.result.current).toEqual(['c', 'b', 'a']);
  });

  it('dedupes — re-tracking moves an id to the front rather than adding a second copy', () => {
    const list = renderHook(() => useRecents());
    const track = renderHook(() => useTrackOpen());
    act(() => {
      track.result.current('a');
      track.result.current('b');
      track.result.current('a');
    });
    expect(list.result.current).toEqual(['a', 'b']);
  });

  it('caps the list at RECENTS_CAP entries', () => {
    const list = renderHook(() => useRecents());
    const track = renderHook(() => useTrackOpen());
    act(() => {
      for (let i = 0; i < RECENTS_CAP + 5; i++) {
        track.result.current(`tool-${i}`);
      }
    });
    expect(list.result.current).toHaveLength(RECENTS_CAP);
    // Most recent is at the front
    expect(list.result.current[0]).toBe(`tool-${RECENTS_CAP + 4}`);
    // Oldest entries were dropped
    expect(list.result.current).not.toContain('tool-0');
  });

  it('forget() removes a specific id, preserving order of the rest', () => {
    const list = renderHook(() => useRecents());
    act(() => {
      trackOpen('a');
      trackOpen('b');
      trackOpen('c');
    });
    expect(list.result.current).toEqual(['c', 'b', 'a']);

    act(() => {
      useRecentsStore.getState().forget('b');
    });
    expect(list.result.current).toEqual(['c', 'a']);
  });

  it('clear() wipes the list', () => {
    const list = renderHook(() => useRecents());
    act(() => {
      trackOpen('a');
      trackOpen('b');
    });
    expect(list.result.current).toHaveLength(2);

    act(() => {
      clearRecents();
    });
    expect(list.result.current).toEqual([]);
  });

  it('persists to localStorage with the expected key', () => {
    act(() => {
      trackOpen('json-validator');
      trackOpen('hex-inspector');
    });
    const raw = localStorage.getItem('hyperspanner/recents/v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.ids).toEqual(['hex-inspector', 'json-validator']);
  });
});
