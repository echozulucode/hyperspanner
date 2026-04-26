// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { CidrCalc } from './CidrCalc';

/**
 * CidrCalc component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Empty-state footer shows "Idle".
 *   - Typing a valid CIDR flips the status to "Valid" and shows key info.
 *   - Typing an invalid CIDR shows an error status with the message.
 *   - The computed table is visible for valid input.
 *   - Membership test (in full mode, not compact) allows IP checks.
 *   - Membership chip shows IN or OUT.
 */

const TOOL_ID = 'cidr-calc-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('CidrCalc', () => {
  it('renders an idle status on first mount', () => {
    render(<CidrCalc toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('transitions to "Valid" when a valid CIDR is entered', () => {
    render(<CidrCalc toolId={TOOL_ID} />);
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '10.0.0.0/24' } });
    });
    expect(screen.getByText('Valid')).not.toBeNull();
    expect(screen.getByText(/IPv4.*\/24.*256 addresses/)).not.toBeNull();
  });

  it('shows error status on invalid CIDR', () => {
    render(<CidrCalc toolId={TOOL_ID} />);
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'not-valid' } });
    });
    const errorPill = screen.getByText(/CIDR format/i);
    expect(errorPill).not.toBeNull();
  });

  it('renders the computed table for valid IPv4 input', () => {
    render(<CidrCalc toolId={TOOL_ID} />);
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '10.0.0.0/24' } });
    });
    expect(screen.getByText('Network Address')).not.toBeNull();
    expect(screen.getByText('Broadcast Address')).not.toBeNull();
    // `10.0.0.0` shows up in multiple table cells (network address +
    // first host) so a single getByText fails. `getAllByText` confirms
    // presence without choking on the duplicate.
    expect(screen.getAllByText(/10\.0\.0\.0/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/10\.0\.0\.255/).length).toBeGreaterThan(0);
  });

  it('renders the computed table for valid IPv6 input', () => {
    render(<CidrCalc toolId={TOOL_ID} />);
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '2001:db8::/32' } });
    });
    expect(screen.getByText('Network Address')).not.toBeNull();
    expect(screen.getByText('Valid')).not.toBeNull();
  });

  it('shows membership test input in full mode', () => {
    render(<CidrCalc toolId={TOOL_ID} zone="center" />);
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '10.0.0.0/24' } });
    });
    const memberInput = screen.getByLabelText('Membership test IP') as HTMLInputElement;
    expect(memberInput).not.toBeNull();
  });

  it('membership test shows IN for an IP in the subnet', () => {
    render(<CidrCalc toolId={TOOL_ID} zone="center" />);
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '10.0.0.0/24' } });
    });
    const memberInput = screen.getByLabelText('Membership test IP') as HTMLInputElement;
    act(() => {
      fireEvent.change(memberInput, { target: { value: '10.0.0.100' } });
    });
    expect(screen.getByText('IN')).not.toBeNull();
  });

  it('membership test shows OUT for an IP outside the subnet', () => {
    render(<CidrCalc toolId={TOOL_ID} zone="center" />);
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '10.0.0.0/24' } });
    });
    const memberInput = screen.getByLabelText('Membership test IP') as HTMLInputElement;
    act(() => {
      fireEvent.change(memberInput, { target: { value: '10.0.1.100' } });
    });
    expect(screen.getByText('OUT')).not.toBeNull();
  });

  it('persists state across re-renders when input is valid', () => {
    const { rerender } = render(<CidrCalc toolId={TOOL_ID} />);
    const input = screen.getByLabelText('CIDR input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '192.168.0.0/16' } });
    });
    expect(screen.getByText('Valid')).not.toBeNull();
    rerender(<CidrCalc toolId={TOOL_ID} />);
    const inputAfter = screen.getByLabelText('CIDR input') as HTMLInputElement;
    expect(inputAfter.value).toBe('192.168.0.0/16');
    expect(screen.getByText('Valid')).not.toBeNull();
  });
});
