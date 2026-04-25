import { useCallback, useEffect, useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import { hashText, hashFile, toHyperspannerError } from '../../ipc';
import {
  ALGORITHMS,
  ALGORITHM_LABELS,
  formatByteSize,
  type HashWorkbenchState,
} from './lib';
import styles from './HashWorkbench.module.css';

export interface HashWorkbenchProps {
  toolId: string;
  zone?: Zone;
}

const DEFAULT_STATE: HashWorkbenchState = {
  mode: 'text',
  text: '',
  filePath: '',
  results: {
    md5: null,
    sha1: null,
    sha256: null,
    sha512: null,
  },
  loading: false,
  error: null,
};

/**
 * Hash Workbench — compute MD5, SHA-1, SHA-256, SHA-512 simultaneously.
 *
 * Two modes:
 *   - Text mode: user pastes text; tool debounces (250ms) and auto-computes
 *     all 4 digests. Results update as you type.
 *   - File mode: user enters a file path and clicks "Compute"; tool fires
 *     4 parallel hash calls and displays results + file size.
 *
 * The digest panel always renders with 4 rows (one per algorithm), showing
 * the digest (or a dash placeholder), and a Copy pill for each.
 */
export const HashWorkbench: FC<HashWorkbenchProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<HashWorkbenchState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';
  const pendingHash = useRef<number | null>(null);

  // Debounce text-mode hashing: clear pending timer on input, set new one.
  useEffect(() => {
    if (state.mode !== 'text') return;

    if (pendingHash.current !== null) {
      clearTimeout(pendingHash.current);
    }

    // Empty text → clear results, don't call hash.
    if (state.text.length === 0) {
      setState({
        results: { md5: null, sha1: null, sha256: null, sha512: null },
        loading: false,
        error: null,
      });
      return;
    }

    // Schedule the hash batch.
    pendingHash.current = window.setTimeout(() => {
      runHashBatch('text');
    }, 250);

    return () => {
      if (pendingHash.current !== null) {
        clearTimeout(pendingHash.current);
      }
    };
  }, [state.text, state.mode, setState]);

  /**
   * Run the hash batch (all 4 algorithms in parallel).
   * Mode determines whether we hash text or file.
   */
  const runHashBatch = useCallback(
    async (mode: 'text' | 'file') => {
      setState({ loading: true });
      try {
        if (mode === 'text') {
          const results = await Promise.all([
            hashText({ text: state.text, algorithm: 'md5' }),
            hashText({ text: state.text, algorithm: 'sha1' }),
            hashText({ text: state.text, algorithm: 'sha256' }),
            hashText({ text: state.text, algorithm: 'sha512' }),
          ]);
          setState({
            results: {
              md5: results[0],
              sha1: results[1],
              sha256: results[2],
              sha512: results[3],
            },
            loading: false,
            error: null,
          });
        } else {
          // file mode
          const results = await Promise.all([
            hashFile({ path: state.filePath, algorithm: 'md5' }),
            hashFile({ path: state.filePath, algorithm: 'sha1' }),
            hashFile({ path: state.filePath, algorithm: 'sha256' }),
            hashFile({ path: state.filePath, algorithm: 'sha512' }),
          ]);
          setState({
            results: {
              md5: results[0],
              sha1: results[1],
              sha256: results[2],
              sha512: results[3],
            },
            loading: false,
            error: null,
          });
        }
      } catch (raw) {
        const err = toHyperspannerError(raw);
        setState({
          loading: false,
          error: { kind: err.kind, message: err.message },
          results: { md5: null, sha1: null, sha256: null, sha512: null },
        });
      }
    },
    [state.text, state.filePath, setState],
  );

  const handleModeToggle = useCallback(() => {
    const newMode = state.mode === 'text' ? 'file' : 'text';
    setState({
      mode: newMode,
      error: null,
    });
  }, [state.mode, setState]);

  const handleClear = useCallback(() => {
    setState({
      text: '',
      filePath: '',
      results: { md5: null, sha1: null, sha256: null, sha512: null },
      error: null,
    });
  }, [setState]);

  const handleFilePathChange = useCallback(
    (filePath: string) => {
      setState({ filePath });
    },
    [setState],
  );

  const handleComputeFile = useCallback(() => {
    if (state.filePath.length === 0) {
      setState({
        error: { kind: 'invalid', message: 'Please enter a file path' },
      });
      return;
    }
    runHashBatch('file');
  }, [state.filePath, setState, runHashBatch]);

  const actions = (
    <>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={handleModeToggle}
        aria-label={`Toggle mode (currently ${state.mode})`}
      >
        {state.mode === 'text' ? 'File' : 'Text'}
      </LcarsPill>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={handleClear}
        aria-label="Clear all inputs and results"
      >
        Clear
      </LcarsPill>
    </>
  );

  const status = renderStatus(state);

  return (
    <ToolFrame
      toolId={toolId}
      title="Hash Workbench"
      subtitle={
        state.mode === 'text'
          ? 'Paste text to hash. All four digests update as you type.'
          : 'Enter a file path and click Compute. Large files are read on the Rust side; no bytes cross the IPC boundary.'
      }
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={`${styles.layout} ${isCompact ? styles.layoutCompact : ''}`}>
        <div className={styles.modeSection}>
          {state.mode === 'text' ? (
            <textarea
              className={`${styles.textArea} ${isCompact ? styles.textAreaCompact : ''}`}
              value={state.text}
              onChange={(e) => setState({ text: e.currentTarget.value })}
              placeholder="Paste or type text to hash..."
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Text input for hashing"
            />
          ) : (
            <>
              <div className={styles.fileInputRow}>
                <input
                  type="text"
                  className={`${styles.fileInput} ${isCompact ? styles.fileInputCompact : ''}`}
                  value={state.filePath}
                  onChange={(e) => handleFilePathChange(e.currentTarget.value)}
                  placeholder="Enter file path (e.g., /path/to/file.bin)"
                  spellCheck={false}
                  aria-label="File path input"
                />
                <LcarsPill
                  size={isCompact ? 'small' : 'medium'}
                  onClick={handleComputeFile}
                  aria-label="Compute hashes for the file"
                >
                  Compute
                </LcarsPill>
              </div>
              {/* Optional: size limit input for file mode */}
            </>
          )}
        </div>

        <div className={styles.digestPanel}>
          {ALGORITHMS.map((algo) => {
            const result = state.results[algo];
            const digest = result?.digest ?? '—';
            return (
              <div key={algo} className={styles.digestRow}>
                <div className={styles.digestLabel}>{ALGORITHM_LABELS[algo]}</div>
                <div className={`${styles.digestValue} ${isCompact ? styles.digestValueCompact : ''}`}>
                  {digest}
                </div>
                <LcarsPill
                  size={isCompact ? 'small' : 'medium'}
                  onClick={() => {
                    if (result?.digest) {
                      navigator.clipboard.writeText(result.digest);
                    }
                  }}
                  disabled={!result}
                  className={styles.copyPill}
                  aria-label={`Copy ${ALGORITHM_LABELS[algo]} digest`}
                >
                  Copy
                </LcarsPill>
              </div>
            );
          })}
        </div>
      </div>
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current state.
 */
function renderStatus(state: HashWorkbenchState): ReactNode {
  // Determine which result to use for size display (all should have the same size).
  const firstResult = Object.values(state.results).find((r) => r !== null);
  const sizeLabel = firstResult ? formatByteSize(firstResult.size) : null;
  const resultCount = Object.values(state.results).filter((r) => r !== null).length;

  if (state.loading) {
    return (
      <ToolStatusPill status="neutral" detail="">
        Hashing…
      </ToolStatusPill>
    );
  }

  if (state.error) {
    return (
      <ToolStatusPill status="error" detail={state.error.message}>
        Error
      </ToolStatusPill>
    );
  }

  if (resultCount === 4 && sizeLabel) {
    return (
      <ToolStatusPill status="ok" detail={`4 algos · ${sizeLabel}`}>
        Complete
      </ToolStatusPill>
    );
  }

  return (
    <ToolStatusPill status="neutral" detail="">
      Idle
    </ToolStatusPill>
  );
}
