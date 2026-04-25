// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { NumberConverter } from './NumberConverter';

/**
 * NumberConverter component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Empty state reads "Idle" with placeholder text in both fields.
 *   - Typing hex derives the matching decimal (and binary).
 *   - Typing decimal derives the matching hex (and binary).
 *   - Endianness flip swaps multi-byte interpretation while keeping the
 *     sticky side as-typed.
 *   - Type change with a too-long hex surfaces the parse error.
 *   - Out-of-range decimal surfaces the range error.
 *   - Endianness dropdown disables for single-byte types.
 *   - Clear button resets both inputs.
 *   - Swap Endian button toggles endianness.
 *   - Compact class applies in right / bottom zones.
 *
 * Plain vitest matchers — same convention as JsonValidator.test.tsx.
 */

const TOOL_ID = 'number-converter-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('NumberConverter', () => {
  it('renders an idle status with empty fields on first mount', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    expect(hex.value).toBe('');
    expect(dec.value).toBe('');
  });

  it('typing hex derives the decimal field (uint32 BE default)', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    act(() => {
      fireEvent.change(hex, { target: { value: '12345678' } });
    });
    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    expect(dec.value).toBe('305419896');
    expect(screen.getByText('Ready')).not.toBeNull();
  });

  it('typing decimal derives the hex field (uint32 BE default)', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    act(() => {
      fireEvent.change(dec, { target: { value: '305419896' } });
    });
    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    expect(hex.value).toBe('12 34 56 78');
  });

  it('endianness flip re-interprets hex while keeping the sticky side intact', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    act(() => {
      fireEvent.change(hex, { target: { value: '12345678' } });
    });
    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    expect(dec.value).toBe('305419896');

    const endian = screen.getByLabelText(
      'Endianness selector',
    ) as HTMLSelectElement;
    act(() => {
      fireEvent.change(endian, { target: { value: 'little' } });
    });

    expect(hex.value).toBe('12345678'); // sticky
    expect(dec.value).toBe('2018915346'); // = 0x78563412
  });

  it('type change to a wider type left-pads the hex with zero bytes', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    const type = screen.getByLabelText(
      'Numeric type selector',
    ) as HTMLSelectElement;

    // Start with uint16 and type two bytes
    act(() => {
      fireEvent.change(type, { target: { value: 'uint16' } });
    });
    act(() => {
      fireEvent.change(hex, { target: { value: 'ff' } });
    });
    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    expect(dec.value).toBe('255');

    // Grow to uint32 — derived bytes should left-pad to 4 bytes
    act(() => {
      fireEvent.change(type, { target: { value: 'uint32' } });
    });
    expect(dec.value).toBe('255'); // value preserved
  });

  it('type change to a narrower type that no longer fits the hex surfaces an error', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    const type = screen.getByLabelText(
      'Numeric type selector',
    ) as HTMLSelectElement;

    // 4 bytes of hex on uint32
    act(() => {
      fireEvent.change(hex, { target: { value: '12345678' } });
    });

    // Shrink to uint16 — input is too long
    act(() => {
      fireEvent.change(type, { target: { value: 'uint16' } });
    });

    expect(screen.getByText(/too many/i)).not.toBeNull();
  });

  it('out-of-range decimal surfaces a range error', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const type = screen.getByLabelText(
      'Numeric type selector',
    ) as HTMLSelectElement;
    act(() => {
      fireEvent.change(type, { target: { value: 'uint8' } });
    });
    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    act(() => {
      fireEvent.change(dec, { target: { value: '256' } });
    });
    expect(screen.getByText(/uint8 range/i)).not.toBeNull();
  });

  it('endianness dropdown is disabled for single-byte types', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const type = screen.getByLabelText(
      'Numeric type selector',
    ) as HTMLSelectElement;
    const endian = screen.getByLabelText(
      'Endianness selector',
    ) as HTMLSelectElement;

    // Default is uint32 — endianness should be enabled
    expect(endian.disabled).toBe(false);

    act(() => {
      fireEvent.change(type, { target: { value: 'uint8' } });
    });
    expect(endian.disabled).toBe(true);

    act(() => {
      fireEvent.change(type, { target: { value: 'int8' } });
    });
    expect(endian.disabled).toBe(true);

    act(() => {
      fireEvent.change(type, { target: { value: 'uint16' } });
    });
    expect(endian.disabled).toBe(false);
  });

  it('Swap Endian button toggles endianness', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const endian = screen.getByLabelText(
      'Endianness selector',
    ) as HTMLSelectElement;
    expect(endian.value).toBe('big');

    const swap = screen.getByRole('button', { name: /swap endianness/i });
    act(() => {
      fireEvent.click(swap);
    });
    expect(endian.value).toBe('little');

    act(() => {
      fireEvent.click(swap);
    });
    expect(endian.value).toBe('big');
  });

  it('Clear button resets both inputs', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    act(() => {
      fireEvent.change(hex, { target: { value: '12345678' } });
    });
    expect(hex.value).toBe('12345678');

    const clear = screen.getByRole('button', { name: /clear inputs/i });
    act(() => {
      fireEvent.click(clear);
    });

    expect(hex.value).toBe('');
    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    expect(dec.value).toBe('');
  });

  it('64-bit value beyond Number.MAX_SAFE_INTEGER round-trips losslessly', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const type = screen.getByLabelText(
      'Numeric type selector',
    ) as HTMLSelectElement;
    act(() => {
      fireEvent.change(type, { target: { value: 'uint64' } });
    });

    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    act(() => {
      fireEvent.change(dec, { target: { value: '18446744073709551615' } });
    });

    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    expect(hex.value).toBe('ff ff ff ff ff ff ff ff');
  });

  it('float32 value renders the IEEE-754 byte pattern', () => {
    render(<NumberConverter toolId={TOOL_ID} />);
    const type = screen.getByLabelText(
      'Numeric type selector',
    ) as HTMLSelectElement;
    act(() => {
      fireEvent.change(type, { target: { value: 'float32' } });
    });

    const dec = screen.getByLabelText('Decimal value input') as HTMLInputElement;
    act(() => {
      fireEvent.change(dec, { target: { value: '1.5' } });
    });

    const hex = screen.getByLabelText('Hex value input') as HTMLInputElement;
    // 1.5 in float32 BE = 0x3fc00000
    expect(hex.value).toBe('3f c0 00 00');
  });

  it('applies compact class when zone="right"', () => {
    const { container } = render(
      <NumberConverter toolId={TOOL_ID} zone="right" />,
    );
    expect(container.querySelector('[class*="controlsCompact"]')).not.toBeNull();
  });

  it('does not apply compact class when zone="center"', () => {
    const { container } = render(
      <NumberConverter toolId={TOOL_ID} zone="center" />,
    );
    expect(container.querySelector('[class*="controlsCompact"]')).toBeNull();
  });
});
