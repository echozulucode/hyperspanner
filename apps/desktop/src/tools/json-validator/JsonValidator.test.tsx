// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { JsonValidator } from './JsonValidator';

/**
 * JsonValidator component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Empty-state footer reads "Idle" instead of a parse error.
 *   - Typing valid JSON flips the status pill to "Valid" and shows the
 *     line + size detail.
 *   - Typing invalid JSON flips the pill to "Parse error" with a
 *     line/column detail and surfaces the runtime message.
 *   - Format button pretty-prints the buffer in place when valid.
 *   - Format button is disabled on invalid input (so we can't destroy the
 *     user's buffer).
 *   - Sample button populates the empty buffer.
 *
 * We use plain vitest matchers rather than `@testing-library/jest-dom`
 * since the repo doesn't ship the latter yet. `screen.getByText` already
 * throws when an element is missing, so a bare `screen.getByText(...)`
 * assertion is effectively a presence check; we use `queryByText`
 * negation for absence.
 */

const TOOL_ID = 'json-validator-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  // `render()` appends to document.body on every call; without a cleanup
  // step the previous test's tree leaks forward and `getByLabelText` finds
  // multiple matches. `@testing-library/react`'s auto-cleanup only fires
  // when the consumer imports `@testing-library/jest-dom` (we don't), so
  // call it explicitly.
  cleanup();
  clearToolState(TOOL_ID);
});

describe('JsonValidator', () => {
  it('renders an idle status on first mount', () => {
    render(<JsonValidator toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const editor = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    expect(editor.value).toBe('');
  });

  it('transitions to "Valid" when typed input parses', () => {
    render(<JsonValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: '{"a":1}' } });
    });
    expect(screen.getByText('Valid')).not.toBeNull();
  });

  it('transitions to "Parse error" with a line/col detail on bad input', () => {
    render(<JsonValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: '{"a":}' } });
    });
    expect(screen.getByText('Parse error')).not.toBeNull();
    // line/col detail format — accept either "line 1, col N" or "position unknown"
    // depending on the runtime's error shape. Assert one of them is present.
    expect(screen.getByText(/line \d+, col \d+|position unknown/)).not.toBeNull();
  });

  it('Format button pretty-prints the buffer when valid', () => {
    render(<JsonValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: '{"a":1,"b":2}' } });
    });
    const format = screen.getByRole('button', { name: /pretty-print/i });
    act(() => {
      fireEvent.click(format);
    });
    const editorAfter = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    expect(editorAfter.value).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it('disables Format/Minify on invalid input', () => {
    render(<JsonValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: '{"oops"' } });
    });
    const format = screen.getByRole('button', { name: /pretty-print/i }) as HTMLButtonElement;
    const minify = screen.getByRole('button', { name: /strip whitespace/i }) as HTMLButtonElement;
    expect(format.disabled).toBe(true);
    expect(minify.disabled).toBe(true);
  });

  it('Sample button fills the empty buffer', () => {
    render(<JsonValidator toolId={TOOL_ID} />);
    const sample = screen.getByRole('button', { name: /load a sample/i });
    act(() => {
      fireEvent.click(sample);
    });
    const editorAfter = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    expect(editorAfter.value.length).toBeGreaterThan(0);
    expect(screen.getByText('Valid')).not.toBeNull();
  });

  it('swaps the Sample button for Clear once the buffer has text', () => {
    render(<JsonValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: '{}' } });
    });
    expect(screen.queryByRole('button', { name: /load a sample/i })).toBeNull();
    const clear = screen.getByRole('button', { name: /clear the buffer/i });
    act(() => {
      fireEvent.click(clear);
    });
    const editorAfter = screen.getByLabelText('JSON input buffer') as HTMLTextAreaElement;
    expect(editorAfter.value).toBe('');
  });
});
