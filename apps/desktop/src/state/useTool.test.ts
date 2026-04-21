// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTool, clearToolState } from './useTool';

/**
 * useTool — react-hook tests.
 *
 * Cover:
 *   - initial state = defaults
 *   - partial-patch setState merges
 *   - function-form setState receives previous state
 *   - reset() restores defaults
 *   - clearToolState() from outside the hook also clears the slot
 *   - state for separate ids does not collide
 *
 * `renderHook`/`act` come from @testing-library/react because React 19
 * dropped the ad-hoc `renderHook` export that the RFC briefly offered.
 */

interface TestState {
  count: number;
  label: string;
}

const defaults: TestState = { count: 0, label: 'idle' };

beforeEach(() => {
  clearToolState('tool-a');
  clearToolState('tool-b');
});

describe('useTool', () => {
  it('returns the defaults on first read', () => {
    const { result } = renderHook(() => useTool<TestState>('tool-a', defaults));
    expect(result.current.state).toEqual(defaults);
  });

  it('merges partial patches via setState', () => {
    const { result } = renderHook(() => useTool<TestState>('tool-a', defaults));
    act(() => {
      result.current.setState({ count: 3 });
    });
    expect(result.current.state).toEqual({ count: 3, label: 'idle' });
  });

  it('accepts a function-form setState that receives previous state', () => {
    const { result } = renderHook(() => useTool<TestState>('tool-a', defaults));
    act(() => {
      result.current.setState((prev) => ({ ...prev, count: prev.count + 10 }));
      result.current.setState((prev) => ({ ...prev, count: prev.count + 5 }));
    });
    expect(result.current.state.count).toBe(15);
  });

  it('reset() restores defaults', () => {
    const { result } = renderHook(() => useTool<TestState>('tool-a', defaults));
    act(() => {
      result.current.setState({ count: 9, label: 'busy' });
    });
    expect(result.current.state.count).toBe(9);
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual(defaults);
  });

  it('keeps separate slots for separate ids', () => {
    const a = renderHook(() => useTool<TestState>('tool-a', defaults));
    const b = renderHook(() => useTool<TestState>('tool-b', { ...defaults, label: 'b' }));
    act(() => {
      a.result.current.setState({ count: 1 });
    });
    expect(a.result.current.state.count).toBe(1);
    expect(b.result.current.state.count).toBe(0);
    expect(b.result.current.state.label).toBe('b');
  });

  it('clearToolState() resets the slot from outside the hook', () => {
    const { result, rerender } = renderHook(() =>
      useTool<TestState>('tool-a', defaults),
    );
    act(() => {
      result.current.setState({ count: 7 });
    });
    expect(result.current.state.count).toBe(7);
    act(() => {
      clearToolState('tool-a');
    });
    rerender();
    expect(result.current.state).toEqual(defaults);
  });
});
