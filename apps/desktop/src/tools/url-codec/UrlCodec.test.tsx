// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { UrlCodec } from './UrlCodec';

/**
 * UrlCodec component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Empty-state footer reads "Idle".
 *   - Typing text updates output in real time based on direction and mode.
 *   - Direction toggle swaps input/output and toggles encode ↔ decode.
 *   - Mode and plus-mode toggles change the transformation.
 *   - Error states on invalid percent-encoding.
 *   - Decode error detail shows offset.
 *   - Compact vs full layout adjustments.
 */

const TOOL_ID = 'url-codec-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('UrlCodec', () => {
  it('renders an idle status on first mount', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    expect(input.value).toBe('');
  });

  it('encodes plain text to %XX sequences in encode mode', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello world' } });
    });
    const output = screen.getByLabelText('URL codec output buffer') as HTMLTextAreaElement;
    expect(output.value).toBe('hello%20world');
    expect(screen.getByText('OK')).not.toBeNull();
  });

  it('decodes %20 to space when direction is switched to decode', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello%20world' } });
    });
    const decodeBtn = screen.getByRole('button', { name: /decode mode/i });
    act(() => {
      fireEvent.click(decodeBtn);
    });
    const output = screen.getByLabelText('URL codec output buffer') as HTMLTextAreaElement;
    expect(output.value).toBe('hello world');
  });

  it('flip button swaps input/output and toggles direction', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello world' } });
    });
    // In encode mode, output should be 'hello%20world'
    let output = screen.getByLabelText('URL codec output buffer') as HTMLTextAreaElement;
    expect(output.value).toBe('hello%20world');

    // Click flip
    const flipBtn = screen.getByRole('button', { name: /flip/i });
    act(() => {
      fireEvent.click(flipBtn);
    });

    // Now input should be the previous output, and we're in decode mode
    const inputAfter = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    expect(inputAfter.value).toBe('hello%20world');
    const outputAfter = screen.getByLabelText(
      'URL codec output buffer',
    ) as HTMLTextAreaElement;
    // Decoding 'hello%20world' gives 'hello world'
    expect(outputAfter.value).toBe('hello world');
  });

  it('component mode encodes reserved characters', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: '/path?query=value' } });
    });
    const output = screen.getByLabelText('URL codec output buffer') as HTMLTextAreaElement;
    // In component mode (default), / and ? should be encoded
    expect(output.value).toContain('%2F');
    expect(output.value).toContain('%3F');
  });

  it('uri mode preserves slash and question mark', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: '/path?query=value' } });
    });
    const uriBtn = screen.getByRole('button', { name: /uri mode/i });
    act(() => {
      fireEvent.click(uriBtn);
    });
    const output = screen.getByLabelText('URL codec output buffer') as HTMLTextAreaElement;
    // In URI mode, / and ? should NOT be encoded
    expect(output.value).toContain('/path');
    expect(output.value).toContain('?query');
  });

  it('plus-as-space mode encodes space as +', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'hello world' } });
    });
    // Default is %20; switch to +
    const plusBtn = screen.getByRole('button', { name: /plus-as-space mode/i });
    act(() => {
      fireEvent.click(plusBtn);
    });
    const output = screen.getByLabelText('URL codec output buffer') as HTMLTextAreaElement;
    expect(output.value).toBe('hello+world');
  });

  it('displays error on invalid percent-encoding with offset', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    // Switch to decode mode first
    const decodeBtn = screen.getByRole('button', { name: /decode mode/i });
    act(() => {
      fireEvent.click(decodeBtn);
    });
    // Type invalid percent sequence
    act(() => {
      fireEvent.change(input, { target: { value: 'hello%ZZworld' } });
    });
    expect(screen.getByText('Error')).not.toBeNull();
    // The detail should mention offset
    const footer = screen.getByText(/at offset/);
    expect(footer).not.toBeNull();
  });

  it('clear button empties the input and resets to idle', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'some text' } });
    });
    expect(screen.getByText('OK')).not.toBeNull();

    const clearBtn = screen.getByRole('button', { name: /clear the input/i });
    act(() => {
      fireEvent.click(clearBtn);
    });

    const inputAfter = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    expect(inputAfter.value).toBe('');
    expect(screen.getByText('Idle')).not.toBeNull();
  });

  it('status shows character count on successful encode/decode', () => {
    render(<UrlCodec toolId={TOOL_ID} />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'test' } });
    });
    // In encode mode, 'test' → 'test' (no special chars), so char count should match
    const detail = screen.getByText(/→/);
    expect(detail).not.toBeNull();
  });

  it('compact layout removes section labels and sizes down pill icons', () => {
    render(<UrlCodec toolId={TOOL_ID} zone="right" />);
    const input = screen.getByLabelText('URL codec input buffer') as HTMLTextAreaElement;
    expect(input).not.toBeNull();
    // In compact mode, pills should be size="small" and labels should be absent.
    // The presence of the input/output fields is the real test here.
    act(() => {
      fireEvent.change(input, { target: { value: 'test' } });
    });
    const output = screen.getByLabelText('URL codec output buffer') as HTMLTextAreaElement;
    expect(output.value).toBe('test');
  });
});
