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
 *   - Mode pills toggle the output transformation.
 *   - Mode pill for the currently-selected mode is disabled (visually distinct).
 *   - Clear button empties the buffer and returns to idle state.
 *   - Zone-responsive layout (compact in right/bottom, full in center).
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

  it('toggles mode when a mode pill is clicked', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello_world' } });
    });

    const snakeCaseButton = screen.getByRole('button', {
      name: /transform to snake_case/i,
    });
    act(() => {
      fireEvent.click(snakeCaseButton);
    });

    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;
    expect(output.value).toBe('hello_world');
  });

  it('disables the currently-selected mode pill', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'test' } });
    });

    // camelCase is the default and should be disabled initially
    const camelButton = screen.getByRole('button', {
      name: /transform to camelCase/i,
    }) as HTMLButtonElement;
    expect(camelButton.disabled).toBe(true);

    // Switch to PascalCase
    const pascalButton = screen.getByRole('button', {
      name: /transform to PascalCase/i,
    });
    act(() => {
      fireEvent.click(pascalButton);
    });

    // Now camelCase should be enabled and PascalCase disabled
    expect(camelButton.disabled).toBe(false);
    const pascalButtonAfter = screen.getByRole('button', {
      name: /transform to PascalCase/i,
    }) as HTMLButtonElement;
    expect(pascalButtonAfter.disabled).toBe(true);
  });

  it('transforms through multiple modes', () => {
    render(<CaseTransform toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Text input for case transformation',
    ) as HTMLTextAreaElement;
    const output = screen.getByLabelText(
      'Case-transformed text output',
    ) as HTMLTextAreaElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'helloWorld' } });
    });

    // Test each mode
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
      const button = screen.getByRole('button', {
        name: new RegExp(`transform to ${name}`, 'i'),
      });
      act(() => {
        fireEvent.click(button);
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

    const snakeCaseButton = screen.getByRole('button', {
      name: /transform to snake_case/i,
    });
    act(() => {
      fireEvent.click(snakeCaseButton);
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
