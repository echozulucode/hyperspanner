// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { YamlValidator } from './YamlValidator';

/**
 * YamlValidator component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Empty-state footer reads "Idle".
 *   - Typing valid YAML flips the status pill to "Valid" and shows line + size.
 *   - Typing invalid YAML flips the pill to "Parse error" with line/col detail.
 *   - Format button pretty-prints the buffer in place when valid.
 *   - Format button is disabled on invalid input.
 *   - Sample button populates the empty buffer.
 *   - View toggle switches between YAML (editable) and JSON (read-only) views
 *     when in full mode; toggle is hidden in compact mode.
 */

const TOOL_ID = 'yaml-validator-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('YamlValidator', () => {
  it('renders an idle status on first mount', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    expect(editor.value).toBe('');
  });

  it('transitions to "Valid" when typed input parses', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: 'name: test\nvalue: 42' } });
    });
    expect(screen.getByText('Valid')).not.toBeNull();
  });

  it('transitions to "Parse error" with a line/col detail on bad input', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: 'foo: [unclosed' } });
    });
    expect(screen.getByText('Parse error')).not.toBeNull();
    expect(screen.getByText(/line \d+, col \d+|position unknown/)).not.toBeNull();
  });

  it('Format button pretty-prints the buffer when valid', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: 'a: 1\nb: 2' } });
    });
    const format = screen.getByRole('button', { name: /format/i });
    act(() => {
      fireEvent.click(format);
    });
    const editorAfter = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    // After formatting, should still be valid YAML with consistent indentation.
    expect(editorAfter.value).toContain('a:');
    expect(editorAfter.value).toContain('b:');
  });

  it('disables Format on invalid input', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: '[unclosed' } });
    });
    const format = screen.getByRole('button', { name: /format/i }) as HTMLButtonElement;
    expect(format.disabled).toBe(true);
  });

  it('Sample button fills the empty buffer', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const sample = screen.getByRole('button', { name: /load a sample/i });
    act(() => {
      fireEvent.click(sample);
    });
    const editorAfter = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    expect(editorAfter.value.length).toBeGreaterThan(0);
    expect(screen.getByText('Valid')).not.toBeNull();
  });

  it('swaps the Sample button for Clear once the buffer has text', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: 'name: test' } });
    });
    expect(screen.queryByRole('button', { name: /load a sample/i })).toBeNull();
    const clear = screen.getByRole('button', { name: /clear the buffer/i });
    act(() => {
      fireEvent.click(clear);
    });
    const editorAfter = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    expect(editorAfter.value).toBe('');
  });

  it('renders "View as JSON" button in full mode when YAML is valid', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: 'name: test' } });
    });
    const viewJson = screen.getByRole('button', { name: /view as JSON/i });
    expect(viewJson).not.toBeNull();
  });

  it('toggles to JSON view when "View as JSON" is clicked', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: 'name: test\nage: 30' } });
    });
    const viewJson = screen.getByRole('button', { name: /view as JSON/i });
    act(() => {
      fireEvent.click(viewJson);
    });
    // After toggling, the textarea should now be read-only and show JSON.
    const jsonView = screen.getByLabelText(/as JSON/i) as HTMLTextAreaElement;
    expect(jsonView.readOnly).toBe(true);
    expect(jsonView.value).toContain('"name"');
    expect(jsonView.value).toContain('"test"');
  });

  it('toggles back to YAML view from JSON view', () => {
    render(<YamlValidator toolId={TOOL_ID} />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: 'name: test' } });
    });
    // Switch to JSON.
    let viewJson = screen.getByRole('button', { name: /view as JSON/i });
    act(() => {
      fireEvent.click(viewJson);
    });
    // Now the button should be "View as YAML".
    const viewYaml = screen.getByRole('button', { name: /view as YAML/i });
    act(() => {
      fireEvent.click(viewYaml);
    });
    // Should be back in YAML mode, editable.
    const yamlView = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    expect(yamlView.readOnly).toBe(false);
    expect(yamlView.value).toContain('name: test');
  });

  it('does not show view toggle in compact mode', () => {
    render(<YamlValidator toolId={TOOL_ID} zone="right" />);
    const editor = screen.getByLabelText('YAML input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(editor, { target: { value: 'name: test' } });
    });
    // In compact mode, the view toggle buttons should not be rendered.
    expect(screen.queryByRole('button', { name: /view as JSON/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /view as YAML/i })).toBeNull();
  });
});
