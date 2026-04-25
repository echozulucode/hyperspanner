// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearToolState } from '../../state/useTool';
import { HexInspector } from './HexInspector';

/**
 * HexInspector component — integration of `ToolFrame` + `useTool` + `lib`.
 *
 * Coverage intent:
 *   - Idle render: status pill says "Idle", no hex dump
 *   - Path input updates state
 *   - Load button reads a mocked file and renders hex rows
 *   - Non-printable bytes render as '.' in ASCII column
 *   - Partial trailing rows are space-padded
 *   - Error paths: readFileBytes rejection surfaces an error status
 *   - Pagination: Prev/Next buttons navigate pages, disabled at boundaries
 *   - Clear button resets the inspector
 */

const TOOL_ID = 'hex-inspector-test';

// Mock readFileBytes
vi.mock('../../ipc/fs', () => ({
  readFileBytes: vi.fn(),
}));

beforeEach(() => {
  clearToolState(TOOL_ID);
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
});

describe('HexInspector', () => {
  it('renders an idle status on first mount', () => {
    render(<HexInspector toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.getByText(/Load a file to view its hex dump/)).not.toBeNull();
  });

  it('path input updates state', () => {
    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '/tmp/test.bin' } });
    });
    expect(input.value).toBe('/tmp/test.bin');
  });

  it('Load button is disabled when path is empty', () => {
    render(<HexInspector toolId={TOOL_ID} />);
    const loadBtn = screen.getByRole('button', { name: /^Load$/i }) as HTMLButtonElement;
    expect(loadBtn.disabled).toBe(true);
  });

  it('Load button is enabled when path is present', () => {
    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '/tmp/test.bin' } });
    });
    const loadBtn = screen.getByRole('button', { name: /^Load$/i }) as HTMLButtonElement;
    expect(loadBtn.disabled).toBe(false);
  });

  it('Load with mocked readFileBytes renders hex rows and updates status', async () => {
    const { readFileBytes } = await import('../../ipc/fs');
    const mockReadFileBytes = vi.mocked(readFileBytes);

    // Mock a 48-byte file (3 rows)
    const fileBytes = new Array(48).fill(0x42); // All 'B'
    mockReadFileBytes.mockResolvedValue({
      bytes: fileBytes,
      size: 48,
      path: '/tmp/test.bin',
    });

    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    const loadBtn = screen.getByRole('button', { name: /^Load$/i });

    act(() => {
      fireEvent.change(input, { target: { value: '/tmp/test.bin' } });
    });

    act(() => {
      fireEvent.click(loadBtn);
    });

    // Wait for the async load to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Status should show "Loaded 48 B · 3 rows"
    expect(screen.getByText('Loaded')).not.toBeNull();
    expect(screen.getByText(/48 B · 3 rows/)).not.toBeNull();

    // Verify hex rows are rendered (should have 3 rows)
    const rows = screen.queryAllByText(/^[0-9a-f]{8}$/);
    // Each row has an offset label
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('non-printable bytes render as . in ASCII column', async () => {
    const { readFileBytes } = await import('../../ipc/fs');
    const mockReadFileBytes = vi.mocked(readFileBytes);

    // Mix of printable and non-printable
    const fileBytes = [0x00, 0x41, 0xff, 0x42]; // NUL "A" 0xFF "B"
    mockReadFileBytes.mockResolvedValue({
      bytes: fileBytes,
      size: 4,
      path: '/tmp/test.bin',
    });

    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    const loadBtn = screen.getByRole('button', { name: /^Load$/i });

    act(() => {
      fireEvent.change(input, { target: { value: '/tmp/test.bin' } });
    });

    act(() => {
      fireEvent.click(loadBtn);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // The ASCII column should show ".A.B" (followed by padding spaces)
    // Find the ASCII section by looking for the pipe characters
    const dumpText = screen.getByText(/^\|/);
    expect(dumpText.textContent).toMatch(/\|\.A\.B\s+\|/);
  });

  it('error path: readFileBytes rejection surfaces error status', async () => {
    const { readFileBytes } = await import('../../ipc/fs');
    const mockReadFileBytes = vi.mocked(readFileBytes);

    mockReadFileBytes.mockRejectedValue({
      kind: 'path_not_found',
      message: 'File not found',
    });

    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    const loadBtn = screen.getByRole('button', { name: /^Load$/i });

    act(() => {
      fireEvent.change(input, { target: { value: '/nonexistent/file.bin' } });
    });

    act(() => {
      fireEvent.click(loadBtn);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Status should show "Read error" with "File not found" detail
    expect(screen.getByText('Read error')).not.toBeNull();
    expect(screen.getByText('File not found')).not.toBeNull();
  });

  it('Pagination: Prev/Next navigate pages correctly', async () => {
    const { readFileBytes } = await import('../../ipc/fs');
    const mockReadFileBytes = vi.mocked(readFileBytes);

    // 2048 bytes = 128 rows = 2 pages (64 rows each)
    const fileBytes = new Array(2048).fill(0x41); // All 'A'
    mockReadFileBytes.mockResolvedValue({
      bytes: fileBytes,
      size: 2048,
      path: '/tmp/test.bin',
    });

    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    const loadBtn = screen.getByRole('button', { name: /^Load$/i });

    act(() => {
      fireEvent.change(input, { target: { value: '/tmp/test.bin' } });
    });

    act(() => {
      fireEvent.click(loadBtn);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Initial page: rows 1–64
    expect(screen.getByText(/rows 1–64 of 128/)).not.toBeNull();

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /Next/i }) as HTMLButtonElement;
    act(() => {
      fireEvent.click(nextBtn);
    });

    // Should show rows 65–128
    expect(screen.getByText(/rows 65–128 of 128/)).not.toBeNull();

    // Click Prev
    const prevBtn = screen.getByRole('button', { name: /Prev/i }) as HTMLButtonElement;
    act(() => {
      fireEvent.click(prevBtn);
    });

    // Should be back at rows 1–64
    expect(screen.getByText(/rows 1–64 of 128/)).not.toBeNull();
  });

  it('Prev button is disabled at page 0, Next button is disabled at last page', async () => {
    const { readFileBytes } = await import('../../ipc/fs');
    const mockReadFileBytes = vi.mocked(readFileBytes);

    const fileBytes = new Array(2048).fill(0x41);
    mockReadFileBytes.mockResolvedValue({
      bytes: fileBytes,
      size: 2048,
      path: '/tmp/test.bin',
    });

    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    const loadBtn = screen.getByRole('button', { name: /^Load$/i });

    act(() => {
      fireEvent.change(input, { target: { value: '/tmp/test.bin' } });
    });

    act(() => {
      fireEvent.click(loadBtn);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const prevBtn = screen.getByRole('button', { name: /Prev/i }) as HTMLButtonElement;
    let nextBtn = screen.getByRole('button', { name: /Next/i }) as HTMLButtonElement;

    // At page 0: Prev disabled, Next enabled
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    // Click Next twice to reach the last page
    act(() => {
      fireEvent.click(nextBtn);
    });
    act(() => {
      fireEvent.click(nextBtn);
    });

    // Re-query because the buttons might be recreated
    nextBtn = screen.getByRole('button', { name: /Next/i }) as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(true);
  });

  it('Clear button resets the inspector', async () => {
    const { readFileBytes } = await import('../../ipc/fs');
    const mockReadFileBytes = vi.mocked(readFileBytes);

    const fileBytes = new Array(48).fill(0x42);
    mockReadFileBytes.mockResolvedValue({
      bytes: fileBytes,
      size: 48,
      path: '/tmp/test.bin',
    });

    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    const loadBtn = screen.getByRole('button', { name: /^Load$/i });

    act(() => {
      fireEvent.change(input, { target: { value: '/tmp/test.bin' } });
    });

    act(() => {
      fireEvent.click(loadBtn);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should be loaded
    expect(screen.getByText('Loaded')).not.toBeNull();

    // Click Clear
    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    act(() => {
      fireEvent.click(clearBtn);
    });

    // Should be back to idle
    expect(screen.getByText('Idle')).not.toBeNull();
    expect(input.value).toBe('');
  });

  it('Empty file renders an empty-file message', async () => {
    const { readFileBytes } = await import('../../ipc/fs');
    const mockReadFileBytes = vi.mocked(readFileBytes);

    mockReadFileBytes.mockResolvedValue({
      bytes: [],
      size: 0,
      path: '/tmp/empty.bin',
    });

    render(<HexInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('File path input') as HTMLInputElement;
    const loadBtn = screen.getByRole('button', { name: /^Load$/i });

    act(() => {
      fireEvent.change(input, { target: { value: '/tmp/empty.bin' } });
    });

    act(() => {
      fireEvent.click(loadBtn);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByText('File is empty')).not.toBeNull();
  });
});
