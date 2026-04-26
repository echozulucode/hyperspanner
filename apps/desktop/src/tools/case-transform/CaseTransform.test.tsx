// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { CaseTransform } from './CaseTransform';

/**
 * CaseTransform component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Empty-state footer reads "Idle" instead of an error.
 *   - Typing text populates both input and output textareas.
 *   - Mode dropdown toggles the output transformation.
 *   - Clear button empties the buffer and returns to idle state.
 *   - Zone-responsive layout (compact in right/bottom, full in center).
 *
 * UX-3.8 (2026-04-24): the mode picker switched from a 7-pill action
 * cluster to a single `<select>` in the body. Tests changed from
 * `getByRole('button', { name: /transform to .../i })` + click to
 * `getByLabelText('Case transformation mode')` + change.
 */

const TOOL_ID = 'case-transform-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('CaseTransform', () => {
  it('renders an idle status on first mount', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const input = screen.getByLabelText('Text input for case transformation') as HTMLTextAreaElement;
    expect(input.value).toBe('');
  });

  it('populates output when text is entered', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello_world' } });
    });
    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;
    expect(output.value).toBe('helloWorld'); // Default mode is camelCase
    expect(screen.getByText('Ready')).not.toBeNull();
  });

  it('transforms to camelCase by default', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello_world_test' } });
    });
    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;
    expect(output.value).toBe('helloWorldTest');
  });

  it('toggles mode when the dropdown changes', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello_world' } });
    });

    const modeSelect = screen.getByLabelText(
      'Case transformation mode',
    ) as HTMLSelectElement;
    act(() => {
      fireEvent.change(modeSelect, { target: { value: 'snake_case' } });
    });

    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;
    expect(output.value).toBe('hello_world');
  });

  it('mode dropdown carries the active value as its selected option', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const modeSelect = screen.getByLabelText(
      'Case transformation mode',
    ) as HTMLSelectElement;

    // camelCase is the default
    expect(modeSelect.value).toBe('camelCase');

    act(() => {
      fireEvent.change(modeSelect, { target: { value: 'PascalCase' } });
    });
    expect(modeSelect.value).toBe('PascalCase');
  });

  it('transforms through multiple modes', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;
    const modeSelect = screen.getByLabelText(
      'Case transformation mode',
    ) as HTMLSelectElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'helloWorld' } });
    });

    // Test each mode by changing the dropdown value.
    const modes: Array<{ name: string; expected: string }> = [
      { name: 'camelCase', expected: 'helloWorld' },
      { name: 'PascalCase', expected: 'HelloWorld' },
      { name: 'snake_case', expected: 'hello_world' },
      { name: 'kebab-case', expected: 'hello-world' },
      { name: 'CONSTANT_CASE', expected: 'HELLO_WORLD' },
      { name: 'lower case', expected: 'hello world' },
      { name: 'UPPER CASE', expected: 'HELLO WORLD' },
    ];

    modes.forEach(({ name, expected }) => {
      act(() => {
        fireEvent.change(modeSelect, { target: { value: name } });
      });
      expect(output.value).toBe(expected);
    });
  });

  it('Clear button empties the buffer and returns to idle', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello_world' } });
    });
    expect(screen.getByText('Ready')).not.toBeNull();

    const clearButton = screen.getByRole('button', {
      name: /clear the buffer/i,
    });
    act(() => {
      fireEvent.click(clearButton);
    });

    expect(input.value).toBe('');
    expect(screen.getByText('Idle')).not.toBeNull();
  });

  it('output textarea is read-only', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;
    expect(output.readOnly).toBe(true);
  });

  it('handles space-separated input', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello world test' } });
    });
    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;
    expect(output.value).toBe('helloWorldTest');
  });

  it('handles mixed separators', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello-world_test' } });
    });

    const modeSelect = screen.getByLabelText(
      'Case transformation mode',
    ) as HTMLSelectElement;
    act(() => {
      fireEvent.change(modeSelect, { target: { value: 'snake_case' } });
    });

    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;
    expect(output.value).toBe('hello_world_test');
  });

  it('shows token and character count in status detail', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello_world' } });
    });
    // "hello_world" has 2 tokens and 11 characters
    expect(screen.getByText(/2 tokens · 11 chars/)).not.toBeNull();
  });
});
