// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { Base64Pad } from './Base64Pad';

/**
 * Base64Pad component — integration tests.
 *
 * Coverage intent:
 *   - Empty-state renders "Idle" status.
 *   - Typing plain text in encode mode produces base64 in output.
 *   - Typing base64 in decode mode produces text in output.
 *   - Direction flip moves output into input, flips direction.
 *   - Variant toggle affects the encoding (no +/ in URL-safe).
 *   - Padding toggle strips = from encode output (only visible in encode mode).
 *   - Error decoding invalid base64 renders error status.
 *   - Clear button empties the input.
 */

const TOOL_ID = 'base64-pad-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('Base64Pad', () => {
  it('renders idle status on first mount', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const input = screen.getByLabelText('Text to encode') as HTMLTextAreaElement;
    expect(input.value).toBe('');
  });

  it('encodes text to base64 when direction is encode', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Text to encode') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } });
    });
    const output = screen.getByLabelText('Base64 output') as HTMLTextAreaElement;
    expect(output.value).toBe('aGVsbG8=');
    expect(screen.getByText('OK')).not.toBeNull();
  });

  it('decodes base64 to text when direction is decode', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const directionBtn = screen.getByRole('button', { name: /toggle direction/i });
    act(() => {
      fireEvent.click(directionBtn);
    });
    const input = screen.getByLabelText('Base64 to decode') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'aGVsbG8=' } });
    });
    const output = screen.getByLabelText('Decoded text output') as HTMLTextAreaElement;
    expect(output.value).toBe('hello');
  });

  it('flips direction and moves output to input', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Text to encode') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } });
    });
    const output = screen.getByLabelText('Base64 output') as HTMLTextAreaElement;
    expect(output.value).toBe('aGVsbG8=');

    // Flip direction
    const directionBtn = screen.getByRole('button', { name: /toggle direction/i });
    act(() => {
      fireEvent.click(directionBtn);
    });

    // Output should now be in input slot
    const newInput = screen.getByLabelText('Base64 to decode') as HTMLTextAreaElement;
    expect(newInput.value).toBe('aGVsbG8=');
    const newOutput = screen.getByLabelText('Decoded text output') as HTMLTextAreaElement;
    expect(newOutput.value).toBe('hello');
  });

  it('toggles between standard and URL-safe variant', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Text to encode') as HTMLTextAreaElement;
    // Use text that produces + or / in standard base64
    act(() => {
      fireEvent.change(input, { target: { value: '??>>' } });
    });
    const outputStd = screen.getByLabelText('Base64 output') as HTMLTextAreaElement;
    const stdText = outputStd.value;
    expect(stdText).toMatch(/[\+/]/); // Should have + or /

    // Toggle to URL-safe
    const variantBtn = screen.getByRole('button', { name: /toggle variant/i });
    act(() => {
      fireEvent.click(variantBtn);
    });
    const outputUrl = screen.getByLabelText('Base64 output') as HTMLTextAreaElement;
    expect(outputUrl.value).not.toMatch(/[\+/]/); // Should have - or _ instead
  });

  it('toggles padding in encode mode', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Text to encode') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'a' } });
    });
    const output = screen.getByLabelText('Base64 output') as HTMLTextAreaElement;
    expect(output.value).toBe('YQ=='); // Padded

    // Toggle padding
    const paddingBtn = screen.getByRole('button', { name: /toggle padding/i });
    act(() => {
      fireEvent.click(paddingBtn);
    });
    const outputUnpadded = screen.getByLabelText('Base64 output') as HTMLTextAreaElement;
    expect(outputUnpadded.value).toBe('YQ'); // No padding
  });

  it('hides padding toggle in decode mode', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const directionBtn = screen.getByRole('button', { name: /toggle direction/i });
    act(() => {
      fireEvent.click(directionBtn);
    });
    expect(screen.queryByRole('button', { name: /toggle padding/i })).toBeNull();
  });

  it('shows error on invalid base64', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const directionBtn = screen.getByRole('button', { name: /toggle direction/i });
    act(() => {
      fireEvent.click(directionBtn);
    });
    const input = screen.getByLabelText('Base64 to decode') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: '@@@' } });
    });
    expect(screen.getByText('Error')).not.toBeNull();
  });

  it('clears input on Clear button', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Text to encode') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } });
    });
    expect(input.value).toBe('hello');

    const clearBtn = screen.getByRole('button', { name: /clear/i });
    act(() => {
      fireEvent.click(clearBtn);
    });
    const inputAfter = screen.getByLabelText('Text to encode') as HTMLTextAreaElement;
    expect(inputAfter.value).toBe('');
    expect(screen.getByText('Idle')).not.toBeNull();
  });

  it('shows correct section labels in full mode', () => {
    render(<Base64Pad toolId={TOOL_ID} zone="center" />);
    expect(screen.getByText('Input (Text)')).not.toBeNull();
    expect(screen.getByText('Output (Base64)')).not.toBeNull();
  });

  it('accepts unpadded base64 on decode', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const directionBtn = screen.getByRole('button', { name: /toggle direction/i });
    act(() => {
      fireEvent.click(directionBtn);
    });
    const input = screen.getByLabelText('Base64 to decode') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'aGVsbG8' } });
    });
    const output = screen.getByLabelText('Decoded text output') as HTMLTextAreaElement;
    expect(output.value).toBe('hello');
    expect(screen.getByText('OK')).not.toBeNull();
  });

  it('round-trips emoji', () => {
    render(<Base64Pad toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Text to encode') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: '🚀' } });
    });
    // Flip to decode
    const directionBtn = screen.getByRole('button', { name: /toggle direction/i });
    act(() => {
      fireEvent.click(directionBtn);
    });
    const decodedOutput = screen.getByLabelText('Decoded text output') as HTMLTextAreaElement;
    expect(decodedOutput.value).toBe('🚀');
  });
});
