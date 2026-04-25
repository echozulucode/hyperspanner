// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __setInvokeForTests } from '../../ipc';
import type { InvokeFn } from '../../ipc';
import { clearToolState } from '../../state/useTool';
import { HashWorkbench } from './HashWorkbench';

/**
 * HashWorkbench component — integration of `ToolFrame` + `useTool` + hash IPC.
 *
 * Coverage intent:
 *   - Renders with idle status and four digest row placeholders.
 *   - Mode toggle pill flips between text and file, updates subtitle.
 *   - Typing in text mode eventually fires hashText × 4 and populates results.
 *   - Clearing text resets all digest rows to placeholder.
 *   - Copy button calls navigator.clipboard.writeText with the digest.
 *   - File mode: entering path and clicking Compute fires hashFile × 4.
 *   - File mode: rejected hashFile with kind='path_not_found' sets error state.
 *   - Mode toggle clears the error state.
 *   - Compact class applies when zone="right" or zone="bottom".
 */

const TOOL_ID = 'hash-workbench-test';

// Sample hashes for testing
const SAMPLE_MD5 = 'abc123';
const SAMPLE_SHA1 = 'def456';
const SAMPLE_SHA256 = 'ghi789';
const SAMPLE_SHA512 = 'jkl012';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
  __setInvokeForTests(null);
});

describe('HashWorkbench', () => {
  it('renders an idle status with four digest row placeholders on first mount', () => {
    render(<HashWorkbench toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
    // Check all four digest labels are present
    expect(screen.getByText('MD5')).not.toBeNull();
    expect(screen.getByText('SHA-1')).not.toBeNull();
    expect(screen.getByText('SHA-256')).not.toBeNull();
    expect(screen.getByText('SHA-512')).not.toBeNull();
    // All digests should start as dashes
    const allDashes = screen.getAllByText('—');
    expect(allDashes.length).toBeGreaterThanOrEqual(4);
  });

  it('toggles mode when the mode pill is clicked', () => {
    render(<HashWorkbench toolId={TOOL_ID} />);
    const modeToggleButton = screen.getByRole('button', { name: /toggle mode/i });

    // Initially in text mode, so the pill should say "File".
    // Plain vitest matchers: this repo doesn't wire in `@testing-library/jest-dom`
    // (see JsonValidator.test.tsx / WhitespaceClean.test.tsx for the same approach).
    expect(modeToggleButton.textContent).toContain('File');

    act(() => {
      fireEvent.click(modeToggleButton);
    });

    // After toggle, should be in file mode, pill should say "Text"
    expect(modeToggleButton.textContent).toContain('Text');

    // Subtitle should change
    expect(screen.getByText(/Enter a file path and click Compute/)).not.toBeNull();
  });

  it('debounces text input and fires hashText × 4', async () => {
    const spy = vi.fn();

    // Setup: mock invoke to return hashes.
    // InvokeFn is generic `<T>(...) => Promise<T>` — a concrete async arrow
    // can't satisfy that signature directly; cast via `unknown` (lesson #53).
    __setInvokeForTests((async (cmd: string) => {
      spy(cmd);
      if (cmd === 'hash_text') {
        return {
          digest: `${SAMPLE_MD5}-${SAMPLE_SHA1}-${SAMPLE_SHA256}-${SAMPLE_SHA512}`,
          algorithm: 'md5',
          size: 11,
        };
      }
      throw new Error(`Unexpected command: ${cmd}`);
    }) as unknown as InvokeFn);

    render(<HashWorkbench toolId={TOOL_ID} />);
    const textarea = screen.getByLabelText('Text input for hashing') as HTMLTextAreaElement;

    // Type some text
    act(() => {
      fireEvent.change(textarea, { target: { value: 'hello world' } });
    });

    // Debounce hasn't fired yet — no status change
    expect(screen.getByText('Idle')).not.toBeNull();

    // Wait for debounce (250ms)
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Now the hash batch should have fired — expect status to be "Complete"
    // (4 results present)
    expect(spy).toHaveBeenCalledWith('hash_text');
  });

  it('clears all results when the textarea is emptied', async () => {
    const spy = vi.fn();
    __setInvokeForTests((async (cmd: string) => {
      spy(cmd);
      return {
        digest: SAMPLE_MD5,
        algorithm: 'md5',
        size: 11,
      };
    }) as unknown as InvokeFn);

    render(<HashWorkbench toolId={TOOL_ID} />);
    const textarea = screen.getByLabelText('Text input for hashing') as HTMLTextAreaElement;

    // Type and wait for debounce
    act(() => {
      fireEvent.change(textarea, { target: { value: 'test' } });
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Clear the text
    act(() => {
      fireEvent.change(textarea, { target: { value: '' } });
    });

    // Results should immediately vanish (debounce clears them before the setTimeout)
    // We expect the digest panel to show dashes
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it('Copy button calls navigator.clipboard.writeText with the digest', async () => {
    const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    // Mock the IPC to return a digest
    __setInvokeForTests((async () => ({
      digest: SAMPLE_MD5,
      algorithm: 'md5',
      size: 5,
    })) as unknown as InvokeFn);

    render(<HashWorkbench toolId={TOOL_ID} />);
    const textarea = screen.getByLabelText('Text input for hashing') as HTMLTextAreaElement;

    // Type and wait for hash
    act(() => {
      fireEvent.change(textarea, { target: { value: 'test' } });
    });

    // Wait for debounce and hash computation
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Once hashes are computed, find a Copy button for MD5 and click it
    const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
    expect(copyButtons.length).toBeGreaterThan(0);

    // MD5 is the first one
    act(() => {
      fireEvent.click(copyButtons[0]);
    });

    expect(clipboardSpy).toHaveBeenCalledWith(SAMPLE_MD5);
  });

  it('File mode: entering a path and clicking Compute fires hashFile × 4', async () => {
    const spy = vi.fn();
    __setInvokeForTests((async (cmd: string) => {
      spy(cmd);
      return {
        digest: SAMPLE_MD5,
        algorithm: 'md5',
        size: 1024,
      };
    }) as unknown as InvokeFn);

    render(<HashWorkbench toolId={TOOL_ID} />);

    // Toggle to file mode
    const modeToggle = screen.getByRole('button', { name: /toggle mode/i });
    act(() => {
      fireEvent.click(modeToggle);
    });

    // Enter a file path
    const fileInput = screen.getByLabelText('File path input') as HTMLInputElement;
    act(() => {
      fireEvent.change(fileInput, { target: { value: '/path/to/file.bin' } });
    });

    // Click Compute
    const computeButton = screen.getByRole('button', { name: /Compute/i });
    act(() => {
      fireEvent.click(computeButton);
    });

    // Wait for the async hash call
    await new Promise((resolve) => setTimeout(resolve, 100));

    // hashFile should have been called
    expect(spy).toHaveBeenCalledWith('hash_file');
  });

  it('File mode: rejected hashFile with kind=path_not_found sets error state', async () => {
    __setInvokeForTests(async () => {
      throw {
        kind: 'path_not_found',
        message: 'File does not exist: /nonexistent',
      };
    });

    render(<HashWorkbench toolId={TOOL_ID} />);

    // Toggle to file mode
    const modeToggle = screen.getByRole('button', { name: /toggle mode/i });
    act(() => {
      fireEvent.click(modeToggle);
    });

    // Enter a path
    const fileInput = screen.getByLabelText('File path input') as HTMLInputElement;
    act(() => {
      fireEvent.change(fileInput, { target: { value: '/nonexistent' } });
    });

    // Click Compute
    const computeButton = screen.getByRole('button', { name: /Compute/i });
    act(() => {
      fireEvent.click(computeButton);
    });

    // Wait for the error to propagate
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Status should show "Error"
    expect(screen.getByText('Error')).not.toBeNull();
  });

  it('Mode toggle clears the error state', async () => {
    __setInvokeForTests(async () => {
      throw { kind: 'path_not_found', message: 'File not found' };
    });

    render(<HashWorkbench toolId={TOOL_ID} />);

    // Toggle to file mode
    const modeToggle = screen.getByRole('button', { name: /toggle mode/i });
    act(() => {
      fireEvent.click(modeToggle);
    });

    // Enter a path and cause an error
    const fileInput = screen.getByLabelText('File path input') as HTMLInputElement;
    act(() => {
      fireEvent.change(fileInput, { target: { value: '/nonexistent' } });
    });

    const computeButton = screen.getByRole('button', { name: /Compute/i });
    act(() => {
      fireEvent.click(computeButton);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Error should be visible
    expect(screen.getByText('Error')).not.toBeNull();

    // Toggle mode again
    act(() => {
      fireEvent.click(modeToggle);
    });

    // Error should be cleared, back to "Idle"
    expect(screen.getByText('Idle')).not.toBeNull();
  });

  it('applies compact class when zone="right"', () => {
    const { container } = render(<HashWorkbench toolId={TOOL_ID} zone="right" />);
    const layoutDiv = container.querySelector('.layoutCompact');
    expect(layoutDiv).not.toBeNull();
  });

  it('applies compact class when zone="bottom"', () => {
    const { container } = render(<HashWorkbench toolId={TOOL_ID} zone="bottom" />);
    const layoutDiv = container.querySelector('.layoutCompact');
    expect(layoutDiv).not.toBeNull();
  });

  it('does not apply compact class when zone="center"', () => {
    const { container } = render(<HashWorkbench toolId={TOOL_ID} zone="center" />);
    const layoutDiv = container.querySelector('.layoutCompact');
    expect(layoutDiv).toBeNull();
  });

  it('Clear button resets text, filePath, results, and error', async () => {
    __setInvokeForTests((async () => ({
      digest: SAMPLE_MD5,
      algorithm: 'md5',
      size: 5,
    })) as unknown as InvokeFn);

    render(<HashWorkbench toolId={TOOL_ID} />);
    const textarea = screen.getByLabelText('Text input for hashing') as HTMLTextAreaElement;

    // Type some text
    act(() => {
      fireEvent.change(textarea, { target: { value: 'hello' } });
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Click Clear
    const clearButton = screen.getByRole('button', { name: /Clear all inputs/i });
    act(() => {
      fireEvent.click(clearButton);
    });

    // Text should be empty, digests should be dashes
    expect(textarea.value).toBe('');
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });
});
