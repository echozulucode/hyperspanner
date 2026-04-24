// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { WhitespaceClean } from './WhitespaceClean';

/**
 * WhitespaceClean component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Empty-state footer reads "Idle" instead of an error.
 *   - Typing text with leading/trailing whitespace flips the status pill to
 *     "Ready" and shows the removed chars/lines count.
 *   - Rule toggles work (pressing a pill turns the rule on/off).
 *   - Output updates instantly as rules are toggled.
 *   - Clear button empties the buffer.
 *   - Compact vs full mode renders the correct set of rule pills.
 *
 * We use plain vitest matchers rather than `@testing-library/jest-dom`
 * since the repo doesn't ship the latter yet.
 */

const TOOL_ID = 'whitespace-clean-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('WhitespaceClean', () => {
  it('renders an idle status on first mount', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    expect(input.value).toBe('');
  });

  it('transitions to "Ready" when text is typed', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: '  hello  ' } });
    });
    expect(screen.getByText('Ready')).not.toBeNull();
  });

  it('shows char/line removal count in the status detail', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: '   hello   ' } });
    });
    // Default options include trimEnds, so 6 chars removed (3 leading + 3 trailing).
    const detail = screen.getByText(/^-\d+ char/);
    expect(detail).not.toBeNull();
  });

  it('shows "No changes" when no rules modify the input', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } });
    });
    // With default options, a plain word gets no changes.
    const detail = screen.getByText('No changes');
    expect(detail).not.toBeNull();
  });

  it('cleans trailing whitespace when trimLines is ON', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello   \nworld' } });
    });
    const output = screen.getByLabelText(
      'Whitespace-cleaned text output',
    ) as HTMLTextAreaElement;
    // trimLines is ON by default, so trailing spaces are removed.
    expect(output.value).toBe('hello\nworld');
  });

  it('toggles rule on and off via pill click', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, {
        target: { value: '  hello   world  ' },
      });
    });

    // Find the "Trim Ends" pill and click it to turn it OFF.
    // Initially it's enabled (ON), so we look for the one that is not disabled.
    const trimEndsPill = screen.getByRole('button', {
      name: /toggle trimEnds.*currently on/i,
    }) as HTMLButtonElement;
    expect(trimEndsPill.disabled).toBe(false);
    act(() => {
      fireEvent.click(trimEndsPill);
    });

    const output = screen.getByLabelText(
      'Whitespace-cleaned text output',
    ) as HTMLTextAreaElement;
    // With trimEnds OFF, the leading spaces should remain.
    expect(output.value.startsWith('  ')).toBe(true);
  });

  it('Clear button empties the buffer', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello world' } });
    });
    const clearButton = screen.getByRole('button', { name: /clear the buffer/i });
    act(() => {
      fireEvent.click(clearButton);
    });
    const inputAfter = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    expect(inputAfter.value).toBe('');
  });

  it('renders full mode with all rule pills', () => {
    render(<WhitespaceClean toolId={TOOL_ID} zone="center" />);
    // In full mode (center zone), all 7 rules should be present.
    expect(screen.getByRole('button', { name: /toggle trimEnds/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /toggle tabsToSpaces/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /toggle stripBom/i })).not.toBeNull();
  });

  it('renders compact mode with only core rule pills', () => {
    render(<WhitespaceClean toolId={TOOL_ID} zone="right" />);
    // In compact mode (right zone), only 5 core rules should be present.
    expect(screen.getByRole('button', { name: /toggle trimEnds/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /toggle normalizeEOL/i })).not.toBeNull();
    // tabsToSpaces and stripBom should NOT be present in compact mode.
    expect(screen.queryByRole('button', { name: /toggle tabsToSpaces/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /toggle stripBom/i })).toBeNull();
  });

  it('normalizes CRLF to LF when normalizeEOL is ON', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    // Input with Windows line endings.
    act(() => {
      fireEvent.change(input, { target: { value: 'hello\r\nworld' } });
    });
    const output = screen.getByLabelText(
      'Whitespace-cleaned text output',
    ) as HTMLTextAreaElement;
    // normalizeEOL is ON by default, so CRLF should become LF.
    expect(output.value).toBe('hello\nworld');
  });

  it('replaces tabs with 2 spaces when tabsToSpaces is ON', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    // First, turn OFF trimEnds and collapseRuns to isolate tabsToSpaces.
    // They start ON, so we click them to turn them OFF (they'll become disabled).
    const trimEndsPill = screen.getByRole('button', {
      name: /toggle trimEnds.*currently on/i,
    });
    const collapseRunsPill = screen.getByRole('button', {
      name: /toggle collapseRuns.*currently on/i,
    });
    act(() => {
      fireEvent.click(trimEndsPill);
      fireEvent.click(collapseRunsPill);
    });

    act(() => {
      fireEvent.change(input, { target: { value: 'hello\tworld' } });
    });

    // Now turn ON tabsToSpaces (it starts OFF, so it's disabled).
    const tabsToSpacesPill = screen.getByRole('button', {
      name: /toggle tabsToSpaces.*currently off/i,
    });
    act(() => {
      fireEvent.click(tabsToSpacesPill);
    });

    const output = screen.getByLabelText(
      'Whitespace-cleaned text output',
    ) as HTMLTextAreaElement;
    expect(output.value).toBe('hello  world');
  });

  it('collapses multiple blank lines when collapseBlankLines is ON', () => {
    render(<WhitespaceClean toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for whitespace cleaning',
    ) as HTMLTextAreaElement;
    // Turn OFF trimEnds to preserve spacing.
    const trimEndsPill = screen.getByRole('button', {
      name: /toggle trimEnds.*currently on/i,
    });
    act(() => {
      fireEvent.click(trimEndsPill);
    });

    act(() => {
      fireEvent.change(input, { target: { value: 'line1\n\n\n\nline2' } });
    });

    const output = screen.getByLabelText(
      'Whitespace-cleaned text output',
    ) as HTMLTextAreaElement;
    // collapseBlankLines is ON by default, so 4 newlines become 2.
    expect(output.value).toBe('line1\n\nline2');
  });
});
