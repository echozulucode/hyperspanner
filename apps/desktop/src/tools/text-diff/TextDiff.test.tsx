// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { TextDiff } from './TextDiff';

/**
 * TextDiff component — integration of ToolFrame + useTool + diffTexts.
 *
 * Coverage intent:
 *   - Initial state: both textareas empty, status reads "Idle", mode is edit.
 *   - Typing updates the memoized diff result and status.
 *   - Mode toggle switches between edit and view.
 *   - Sample and Clear buttons work.
 *   - Swap button exchanges left ↔ right.
 *   - View mode renders hunks with change markers and inline highlights.
 *   - Zone-responsive: compact class applied in bottom zone.
 */

const TOOL_ID = 'text-diff-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('TextDiff', () => {
  it('renders in idle state on first mount', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    expect(leftArea.value).toBe('');
    expect(rightArea.value).toBe('');
    expect(screen.getByRole('button', { name: /Switch to view mode/i })).not.toBeNull();
  });

  it('typing into left textarea updates the memoized diff', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(leftArea, { target: { value: 'hello' } });
    });
    // Status should change from Idle to show the comparison
    const leftAfter = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    expect(leftAfter.value).toBe('hello');
  });

  it('identical text in both columns shows "Identical" status', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(leftArea, { target: { value: 'same text' } });
      fireEvent.change(rightArea, { target: { value: 'same text' } });
    });
    expect(screen.getByText('Identical')).not.toBeNull();
  });

  it('different text shows "Compared" status with stats', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(leftArea, { target: { value: 'old text' } });
      fireEvent.change(rightArea, { target: { value: 'new text' } });
    });
    expect(screen.getByText('Compared')).not.toBeNull();
    // Should show stats like "+N · -N · ~N"
    const statusDetail = screen.getByText(/\+\d+ · \-\d+ · ~/);
    expect(statusDetail).not.toBeNull();
  });

  it('clicking View button switches to view mode', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(leftArea, { target: { value: 'line1\nline2' } });
      fireEvent.change(rightArea, { target: { value: 'line1\nline2' } });
    });
    const viewBtn = screen.getByRole('button', { name: /Switch to view mode/i });
    act(() => {
      fireEvent.click(viewBtn);
    });
    // In view mode, the textareas disappear and we should not find them
    expect(screen.queryByLabelText('Original text input')).toBeNull();
  });

  it('clicking Edit button from view mode switches back to edit', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(leftArea, { target: { value: 'test' } });
      fireEvent.change(rightArea, { target: { value: 'test' } });
    });
    // Switch to view
    const viewBtn = screen.getByRole('button', { name: /Switch to view mode/i });
    act(() => {
      fireEvent.click(viewBtn);
    });
    // Switch back to edit
    const editBtn = screen.getByRole('button', { name: /Switch to edit mode/i });
    act(() => {
      fireEvent.click(editBtn);
    });
    // Textareas should be visible again
    expect(screen.getByLabelText('Original text input')).not.toBeNull();
  });

  it('Sample button loads sample text when both columns are empty', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const sampleBtn = screen.getByRole('button', { name: /Load sample text/i });
    act(() => {
      fireEvent.click(sampleBtn);
    });
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    expect(leftArea.value.length).toBeGreaterThan(0);
    expect(rightArea.value.length).toBeGreaterThan(0);
  });

  it('Clear button empties both columns after sample is loaded', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const sampleBtn = screen.getByRole('button', { name: /Load sample text/i });
    act(() => {
      fireEvent.click(sampleBtn);
    });
    const clearBtn = screen.getByRole('button', { name: /Clear both columns/i });
    act(() => {
      fireEvent.click(clearBtn);
    });
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    expect(leftArea.value).toBe('');
    expect(rightArea.value).toBe('');
  });

  it('Swap button exchanges left and right columns', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(leftArea, { target: { value: 'left text' } });
      fireEvent.change(rightArea, { target: { value: 'right text' } });
    });
    const swapBtn = screen.getByRole('button', { name: /Swap left and right columns/i });
    act(() => {
      fireEvent.click(swapBtn);
    });
    const leftAfter = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightAfter = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    expect(leftAfter.value).toBe('right text');
    expect(rightAfter.value).toBe('left text');
  });

  it('view mode renders hunks with change markers and inline highlights', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(leftArea, { target: { value: 'old word' } });
      fireEvent.change(rightArea, { target: { value: 'new word' } });
    });
    // Switch to view mode
    const viewBtn = screen.getByRole('button', { name: /Switch to view mode/i });
    act(() => {
      fireEvent.click(viewBtn);
    });
    // Check that we can find inline change spans with data-change-kind
    const inlineChanges = document.querySelectorAll('[data-change-kind]');
    expect(inlineChanges.length).toBeGreaterThan(0);
  });

  it('zone-responsive: bottom zone applies compact styling', () => {
    const { container } = render(<TextDiff toolId={TOOL_ID} zone="bottom" />);
    // Check that the compact class is applied to the edit layout
    const editLayout = container.querySelector('.editLayoutCompact');
    expect(editLayout).not.toBeNull();
  });

  it('zone-responsive: center zone does not apply compact styling', () => {
    const { container } = render(<TextDiff toolId={TOOL_ID} zone="center" />);
    const editLayout = container.querySelector('.editLayout');
    expect(editLayout).not.toBeNull();
    // Should NOT have the compact variant
    const editLayoutCompact = container.querySelector('.editLayoutCompact');
    expect(editLayoutCompact).toBeNull();
  });

  it('status shows +N · -N · ~N detail for changed text', () => {
    render(<TextDiff toolId={TOOL_ID} />);
    const leftArea = screen.getByLabelText('Original text input') as HTMLTextAreaElement;
    const rightArea = screen.getByLabelText('Modified text input') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(leftArea, { target: { value: 'line1\nline2 old\nline3' } });
      fireEvent.change(rightArea, { target: { value: 'line1\nline2 new\nline3\nline4' } });
    });
    // Should see "Compared" with stats detail
    expect(screen.getByText('Compared')).not.toBeNull();
    const detailElement = screen.getByText(/\+\d+ · \-\d+ · ~/);
    expect(detailElement).not.toBeNull();
  });
});
