// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { RegexTester } from './RegexTester';

/**
 * RegexTester component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Empty-state footer reads "Ready".
 *   - Typing a valid pattern shows "Valid" with match count.
 *   - Typing an invalid pattern shows "Invalid Pattern" with error message.
 *   - Matches are listed in the match panel.
 *   - Flag toggles apply correctly.
 *   - Preview toggle shows/hides the highlighted preview.
 *   - Sample button populates pattern and sample text.
 *   - Clear button empties both fields.
 */

const TOOL_ID = 'regex-tester-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('RegexTester', () => {
  it('renders a ready status on first mount', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    expect(screen.getByText('Ready')).not.toBeNull();
  });

  it('transitions to "Valid" when pattern is entered', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    act(() => {
      fireEvent.change(pattern, { target: { value: 'foo' } });
    });
    expect(screen.getByText('Valid')).not.toBeNull();
  });

  it('transitions to "Invalid Pattern" when an invalid pattern is entered', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    act(() => {
      fireEvent.change(pattern, { target: { value: '(/' } });
    });
    expect(screen.getByText('Invalid Pattern')).not.toBeNull();
  });

  it('displays match count when pattern matches sample text', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    const sample = screen.getByLabelText('Sample text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(pattern, { target: { value: 'foo' } });
      fireEvent.change(sample, { target: { value: 'foo bar foo' } });
    });
    expect(screen.getByText(/2 matches/)).not.toBeNull();
  });

  it('displays "No matches found" when pattern does not match', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    const sample = screen.getByLabelText('Sample text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(pattern, { target: { value: 'baz' } });
      fireEvent.change(sample, { target: { value: 'foo bar' } });
    });
    expect(screen.getByText('No matches found')).not.toBeNull();
  });

  it('toggles flags when flag pills are clicked', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    const sample = screen.getByLabelText('Sample text input') as HTMLTextAreaElement;
    const iFlag = screen.getByLabelText('Toggle i flag') as HTMLButtonElement;

    act(() => {
      fireEvent.change(pattern, { target: { value: 'foo' } });
      fireEvent.change(sample, { target: { value: 'FOO' } });
    });

    // Without i flag, no match.
    expect(screen.getByText('No matches found')).not.toBeNull();

    // Toggle i flag on.
    act(() => {
      fireEvent.click(iFlag);
    });

    // Now should have a match.
    expect(screen.getByText(/1 match/)).not.toBeNull();
  });

  it('toggles the preview with the checkbox', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    const sample = screen.getByLabelText('Sample text input') as HTMLTextAreaElement;
    const previewToggle = screen.getByLabelText('Toggle highlighted preview') as HTMLInputElement;

    act(() => {
      fireEvent.change(pattern, { target: { value: 'foo' } });
      fireEvent.change(sample, { target: { value: 'foo bar' } });
    });

    // Preview is on by default.
    expect(previewToggle.checked).toBe(true);

    // Turn preview off.
    act(() => {
      fireEvent.click(previewToggle);
    });
    expect(previewToggle.checked).toBe(false);

    // Turn preview back on.
    act(() => {
      fireEvent.click(previewToggle);
    });
    expect(previewToggle.checked).toBe(true);
  });

  it('Sample button fills the pattern and sample text', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const sample = screen.getByRole('button', { name: /load a sample/i });
    act(() => {
      fireEvent.click(sample);
    });
    const patternInput = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    const sampleInput = screen.getByLabelText('Sample text input') as HTMLTextAreaElement;
    expect(patternInput.value.length).toBeGreaterThan(0);
    expect(sampleInput.value.length).toBeGreaterThan(0);
    expect(screen.getByText('Valid')).not.toBeNull();
  });

  it('Clear button empties the pattern and sample text', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    const sample = screen.getByLabelText('Sample text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(pattern, { target: { value: 'test' } });
      fireEvent.change(sample, { target: { value: 'test data' } });
    });
    const clear = screen.getByRole('button', { name: /clear/i });
    act(() => {
      fireEvent.click(clear);
    });
    const patternAfter = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    const sampleAfter = screen.getByLabelText('Sample text input') as HTMLTextAreaElement;
    expect(patternAfter.value).toBe('');
    expect(sampleAfter.value).toBe('');
  });

  it('renders flag suffix in the pattern chrome', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    act(() => {
      fireEvent.change(pattern, { target: { value: 'foo' } });
    });
    // The suffix should show 'g' since the global flag is on by default.
    const element = pattern.parentElement?.textContent;
    expect(element).toMatch(/\/g/);
  });

  it('multiline flag affects ^ anchor matching', () => {
    render(<RegexTester toolId={TOOL_ID} />);
    const pattern = screen.getByLabelText('Regex pattern') as HTMLInputElement;
    const sample = screen.getByLabelText('Sample text input') as HTMLTextAreaElement;
    const mFlag = screen.getByLabelText('Toggle m flag') as HTMLButtonElement;

    act(() => {
      fireEvent.change(pattern, { target: { value: '^foo' } });
      fireEvent.change(sample, { target: { value: 'bar\nfoo' } });
    });

    // Without m flag, no match.
    expect(screen.getByText('No matches found')).not.toBeNull();

    // Toggle m flag on.
    act(() => {
      fireEvent.click(mFlag);
    });

    // Now should match the foo after the newline.
    expect(screen.getByText(/1 match/)).not.toBeNull();
  });
});
