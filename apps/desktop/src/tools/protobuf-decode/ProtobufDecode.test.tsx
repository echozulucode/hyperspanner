// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __setInvokeForTests } from '../../ipc';
import type { InvokeFn } from '../../ipc';
import { clearToolState } from '../../state/useTool';
import { ProtobufDecode } from './ProtobufDecode';
import type { WireField } from './lib';

const TOOL_ID = 'protobuf-decode-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
  __setInvokeForTests(null);
});

describe('ProtobufDecode', () => {
  it('renders idle status with empty input on first mount', () => {
    render(<ProtobufDecode toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
  });

  it('decodes hex input via the IPC and shows the field tree', async () => {
    const fields: WireField[] = [
      {
        field: 1,
        wireType: 0,
        wireTypeLabel: 'varint',
        value: { kind: 'varint', uint: '150', int: '150' },
      },
    ];
    __setInvokeForTests(((async () => fields) as unknown) as InvokeFn);

    render(<ProtobufDecode toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Protobuf hex input',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: '089601' } });
    });

    // Wait for the debounce (300ms) + a beat for the promise to flush.
    await new Promise((r) => setTimeout(r, 350));

    expect(screen.getByText('Decoded')).not.toBeNull();
    expect(screen.getByText('#1')).not.toBeNull();
    expect(screen.getByText('varint')).not.toBeNull();
  });

  it('surfaces a backend error on the status pill', async () => {
    __setInvokeForTests((async () => {
      throw { kind: 'invalid_hex', message: 'Hex contains non-hex characters' };
    }) as unknown as InvokeFn);

    render(<ProtobufDecode toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Protobuf hex input',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'zzz' } });
    });
    await new Promise((r) => setTimeout(r, 350));

    // The component intentionally surfaces the same error message in two
    // places — the body's empty-state slot and the status pill — so the
    // user sees it whether they're looking at the body or the footer.
    // `getAllByText` confirms presence without choking on the duplicate.
    expect(
      screen.getAllByText('Hex contains non-hex characters').length,
    ).toBeGreaterThan(0);
  });

  it('Sample button populates a canonical payload', () => {
    render(<ProtobufDecode toolId={TOOL_ID} />);
    const sample = screen.getByRole('button', { name: /sample/i });
    act(() => {
      fireEvent.click(sample);
    });
    const input = screen.getByLabelText(
      'Protobuf hex input',
    ) as HTMLTextAreaElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  it('Clear button resets input and error', async () => {
    __setInvokeForTests((async () => {
      throw { kind: 'invalid_hex', message: 'bad' };
    }) as unknown as InvokeFn);

    render(<ProtobufDecode toolId={TOOL_ID} />);
    const input = screen.getByLabelText(
      'Protobuf hex input',
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'zzz' } });
    });
    await new Promise((r) => setTimeout(r, 350));

    const clear = screen.getByRole('button', { name: /clear/i });
    act(() => {
      fireEvent.click(clear);
    });
    expect(input.value).toBe('');
    expect(screen.getByText('Idle')).not.toBeNull();
  });

  // Suppress the "act warning" for the async setTimeout inside debounce —
  // vitest's act-stricture setting fires a console.error that's not a
  // real failure here.
  it('compact mode applies the .containerCompact class on right zone', () => {
    const { container } = render(
      <ProtobufDecode toolId={TOOL_ID} zone="right" />,
    );
    expect(
      container.querySelector('[class*="containerCompact"]'),
    ).not.toBeNull();
    // Quiet a noisy spy if vi.fn was set up elsewhere
    vi.restoreAllMocks();
  });
});
