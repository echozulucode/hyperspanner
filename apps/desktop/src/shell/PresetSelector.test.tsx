// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearWorkspaceStorage, useWorkspaceStore, LAYOUT_PRESETS } from '../state';
import { PresetSelector } from './PresetSelector';

/**
 * PresetSelector — verify the shell's preset dropdown.
 *
 * Coverage:
 *   - Current preset id is the `<select>`'s value.
 *   - Each built-in preset renders as an option.
 *   - Changing the value dispatches `applyPreset` on the workspace store.
 *   - The store update is observable (e.g., layoutPreset changes).
 */

beforeEach(() => {
  clearWorkspaceStorage();
});

afterEach(() => {
  cleanup();
  clearWorkspaceStorage();
});

describe('PresetSelector', () => {
  it('shows the current preset id as the selected option', () => {
    render(<PresetSelector />);
    const select = screen.getByLabelText('Layout preset') as HTMLSelectElement;
    // Default workspace ships with layoutPreset === 'default'.
    expect(select.value).toBe('default');
  });

  it('renders one option per built-in preset', () => {
    render(<PresetSelector />);
    const select = screen.getByLabelText('Layout preset') as HTMLSelectElement;
    const presetIds = Object.keys(LAYOUT_PRESETS);
    const optionValues = Array.from(select.options).map((o) => o.value);
    presetIds.forEach((id) => {
      expect(optionValues).toContain(id);
    });
    // No phantom options.
    expect(optionValues).toHaveLength(presetIds.length);
  });

  it('applies the chosen preset on change', () => {
    render(<PresetSelector />);
    const select = screen.getByLabelText('Layout preset') as HTMLSelectElement;
    act(() => {
      fireEvent.change(select, { target: { value: 'minimal-focus' } });
    });
    // The workspace store's layoutPreset reflects the new id.
    expect(useWorkspaceStore.getState().layoutPreset).toBe('minimal-focus');
    // And the select itself reads back the new value.
    expect(select.value).toBe('minimal-focus');
  });

  it('updates its displayed value when the store is changed externally', () => {
    render(<PresetSelector />);
    const select = screen.getByLabelText('Layout preset') as HTMLSelectElement;
    expect(select.value).toBe('default');
    act(() => {
      useWorkspaceStore.getState().applyPreset('binary-inspection');
    });
    // React subscriber re-renders with the new value.
    expect(select.value).toBe('binary-inspection');
  });
});
