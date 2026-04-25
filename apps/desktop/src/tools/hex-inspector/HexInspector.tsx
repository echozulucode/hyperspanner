import { useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import { readFileBytes } from '../../ipc/fs';
import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import {
  formatHexRows,
  formatOffsetLabel,
  PAGE_ROWS,
  totalRows,
} from './lib';
import styles from './HexInspector.module.css';

export interface HexInspectorProps {
  toolId: string;
  zone?: Zone;
}

interface HexInspectorState {
  /** The file path being inspected. */
  filePath: string;
  /** Parsed bytes from the current file, or null when nothing loaded or after clear. */
  bytes: number[] | null;
  /** Total file size reported by the backend. */
  size: number;
  /** True while a read operation is in progress. */
  loading: boolean;
  /** Error from the last read attempt, or null. */
  error: { kind: string; message: string } | null;
  /** The first row index of the current window (for pagination). */
  offsetRow: number;
}

const DEFAULT_STATE: HexInspectorState = {
  filePath: '',
  bytes: null,
  size: 0,
  loading: false,
  error: null,
  offsetRow: 0,
};

/**
 * Hex Inspector — render the raw bytes of a file as a dense hex+ASCII dump.
 *
 * Loads a file via path input + Load button. Renders 64 rows (1 KiB) per page
 * in a classic 16-column layout with offset, hex, and ASCII columns.
 * Pagination controls allow browsing large files without rendering the full DOM.
 */
export const HexInspector: FC<HexInspectorProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<HexInspectorState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  const handlePathChange = useCallback(
    (path: string) => {
      setState({ filePath: path });
    },
    [setState],
  );

  const handleLoad = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const result = await readFileBytes({ path: state.filePath });
      // Convert the number[] from the IPC to state (Uint8Array doesn't round-trip
      // cleanly through persistence, so we keep it as number[] in state and
      // reconstruct Uint8Array at render time).
      setState({
        bytes: result.bytes,
        size: result.size,
        loading: false,
        offsetRow: 0,
      });
    } catch (err: unknown) {
      const error = err as any;
      setState({
        loading: false,
        error: {
          kind: error?.kind ?? 'unknown_error',
          message: error?.message ?? String(err),
        },
      });
    }
  }, [state.filePath, setState]);

  const handleClear = useCallback(() => {
    setState({
      filePath: '',
      bytes: null,
      size: 0,
      loading: false,
      error: null,
      offsetRow: 0,
    });
  }, [setState]);

  const handlePrev = useCallback(() => {
    // Spread prev so TS can prove the return is a full HexInspectorState;
    // useTool's functional-updater form requires the complete shape.
    setState((prev) => ({
      ...prev,
      offsetRow: Math.max(0, prev.offsetRow - PAGE_ROWS),
    }));
  }, [setState]);

  const handleNext = useCallback(() => {
    const totalRowCount = state.bytes ? totalRows(state.bytes.length) : 0;
    setState((prev) => ({
      ...prev,
      offsetRow: Math.min(prev.offsetRow + PAGE_ROWS, Math.max(0, totalRowCount - PAGE_ROWS)),
    }));
  }, [state.bytes, setState]);

  const byteArray = state.bytes ? new Uint8Array(state.bytes) : new Uint8Array(0);
  const totalRowCount = totalRows(byteArray.length);
  const canGoPrev = state.offsetRow > 0;
  const canGoNext = state.offsetRow + PAGE_ROWS < totalRowCount;

  // Render the hex dump rows
  const rows = useMemo(() => {
    if (!state.bytes || state.bytes.length === 0) {
      return [];
    }
    return formatHexRows(byteArray, state.offsetRow, PAGE_ROWS);
  }, [state.bytes, byteArray, state.offsetRow]);

  // Pagination label
  const pageLabel = useMemo(() => {
    if (state.bytes === null) return '';
    if (totalRowCount === 0) return '0 rows';
    const endRow = Math.min(state.offsetRow + PAGE_ROWS, totalRowCount);
    return `rows ${state.offsetRow + 1}–${endRow} of ${totalRowCount}`;
  }, [state.bytes, state.offsetRow, totalRowCount]);

  const actions = (
    <>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={handleLoad}
        disabled={!state.filePath.trim() || state.loading}
        aria-label="Load the file"
      >
        Load
      </LcarsPill>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={handleClear}
        disabled={!state.filePath && !state.bytes}
        aria-label="Clear the inspector"
      >
        Clear
      </LcarsPill>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous page"
      >
        ← Prev
      </LcarsPill>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next page"
      >
        Next →
      </LcarsPill>
      <span className={styles.paginationInfo}>{pageLabel}</span>
    </>
  );

  const status = renderStatus(state);

  return (
    <ToolFrame
      toolId={toolId}
      title="Hex Inspector"
      subtitle="Enter a file path and click Load. The file is read on the Rust side; the UI renders a 16-byte-wide hex+ASCII dump."
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={styles.container}>
        <div className={styles.inputRow}>
          <input
            type="text"
            className={styles.pathInput}
            value={state.filePath}
            onChange={(e) => handlePathChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && state.filePath.trim()) {
                handleLoad();
              }
            }}
            placeholder="Enter file path (e.g., C:\path\to\file.bin)"
            aria-label="File path input"
          />
        </div>

        <div className={styles.dumpContainer}>
          {state.bytes === null ? (
            <div className={styles.dumpEmpty}>
              {state.loading ? 'Loading...' : 'Load a file to view its hex dump'}
            </div>
          ) : rows.length === 0 ? (
            <div className={styles.dumpEmpty}>File is empty</div>
          ) : (
            <div className={styles.dump}>
              {rows.map((row) => (
                <div key={row.offset} className={styles.row}>
                  <span className={styles.rowOffset}>{formatOffsetLabel(row.offset)}</span>
                  <span className={styles.rowHex}>{row.hex}</span>
                  <span className={styles.rowAscii}>|{row.ascii}|</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current state.
 */
function renderStatus(state: HexInspectorState): ReactNode {
  if (state.loading) {
    return <ToolStatusPill status="neutral">Loading...</ToolStatusPill>;
  }

  if (state.error) {
    const detail = formatErrorDetail(state.error);
    return (
      <ToolStatusPill status="error" detail={detail}>
        Read error
      </ToolStatusPill>
    );
  }

  if (state.bytes === null) {
    return <ToolStatusPill status="neutral">Idle</ToolStatusPill>;
  }

  const sizeLabel = formatByteSize(state.size);
  const rowCount = totalRows(state.size);
  const detail = `${sizeLabel} · ${rowCount} rows`;

  return (
    <ToolStatusPill status="ok" detail={detail}>
      Loaded
    </ToolStatusPill>
  );
}

/**
 * Convert an error object to a human-readable detail string.
 */
function formatErrorDetail(error: { kind: string; message: string }): string {
  const kind = error.kind;
  if (kind === 'path_not_found') return 'File not found';
  if (kind === 'not_a_file') return 'Path is not a file';
  if (kind === 'file_too_large') return 'File too large (raise max_bytes or pick a smaller file)';
  return error.message;
}

/**
 * Bytes → B / KB / MB label. Uses 1024-based units.
 */
function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
