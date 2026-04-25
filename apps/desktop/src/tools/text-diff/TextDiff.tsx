import { useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import { diffTexts } from './lib';
import type { DiffResult } from './lib';
import styles from './TextDiff.module.css';

export interface TextDiffProps {
  toolId: string;
  zone?: Zone;
}

interface TextDiffState {
  left: string;
  right: string;
  mode: 'edit' | 'view';
}

const DEFAULT_STATE: TextDiffState = {
  left: '',
  right: '',
  mode: 'edit',
};

const SAMPLE_LEFT = `function greet(name) {
  console.log("Hello " + name);
  return true;
}`;

const SAMPLE_RIGHT = `function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}`;

/**
 * Text Diff — side-by-side diff tool with inline word-level highlighting.
 *
 * Features:
 *   - Two-column editor mode for pasting/typing text.
 *   - View mode showing side-by-side hunks with line numbers and change markers.
 *   - Word-level highlighting on modified lines (unchanged/added/removed spans).
 *   - Zone-responsive: stacks vertically in bottom zone, side-by-side in center.
 *   - Sample/Clear and Swap buttons.
 */
export const TextDiff: FC<TextDiffProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<TextDiffState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  // Memoize the diff result on [left, right]
  const diff = useMemo<DiffResult>(
    () => diffTexts(state.left, state.right),
    [state.left, state.right],
  );

  const handleLeftChange = useCallback(
    (left: string) => {
      setState({ left });
    },
    [setState],
  );

  const handleRightChange = useCallback(
    (right: string) => {
      setState({ right });
    },
    [setState],
  );

  const handleModeToggle = useCallback(() => {
    setState({ mode: state.mode === 'edit' ? 'view' : 'edit' });
  }, [state.mode, setState]);

  const handleSwap = useCallback(() => {
    setState({ left: state.right, right: state.left });
  }, [state.left, state.right, setState]);

  const handleSample = useCallback(() => {
    if (state.left.length === 0 && state.right.length === 0) {
      setState({ left: SAMPLE_LEFT, right: SAMPLE_RIGHT });
    }
  }, [state.left, state.right, setState]);

  const handleClear = useCallback(() => {
    setState({ left: '', right: '' });
  }, [setState]);

  const actions = (
    <>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={handleModeToggle}
        aria-label={state.mode === 'edit' ? 'Switch to view mode' : 'Switch to edit mode'}
      >
        {state.mode === 'edit' ? 'View' : 'Edit'}
      </LcarsPill>
      {!isCompact && (
        <LcarsPill
          size="medium"
          onClick={handleSwap}
          aria-label="Swap left and right columns"
        >
          Swap
        </LcarsPill>
      )}
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={state.left.length === 0 && state.right.length === 0 ? handleSample : handleClear}
        aria-label={
          state.left.length === 0 && state.right.length === 0
            ? 'Load sample text'
            : 'Clear both columns'
        }
      >
        {state.left.length === 0 && state.right.length === 0 ? 'Sample' : 'Clear'}
      </LcarsPill>
    </>
  );

  const status = renderStatus(diff, state.left, state.right);

  if (state.mode === 'edit') {
    return (
      <ToolFrame
        toolId={toolId}
        title="Text Diff"
        subtitle="Paste or type two texts to compare. Switch to View mode to see side-by-side highlighting."
        zone={zone}
        actions={actions}
        status={status}
      >
        <div className={`${styles.editLayout} ${isCompact ? styles.editLayoutCompact : ''}`}>
          <div className={styles.column}>
            <div className={styles.columnLabel}>ORIGINAL</div>
            <textarea
              className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
              value={state.left}
              onChange={(e) => handleLeftChange(e.currentTarget.value)}
              placeholder="Paste or type the original text here"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Original text input"
            />
          </div>
          <div className={styles.column}>
            <div className={styles.columnLabel}>MODIFIED</div>
            <textarea
              className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
              value={state.right}
              onChange={(e) => handleRightChange(e.currentTarget.value)}
              placeholder="Paste or type the modified text here"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Modified text input"
            />
          </div>
        </div>
      </ToolFrame>
    );
  }

  // View mode
  return (
    <ToolFrame
      toolId={toolId}
      title="Text Diff"
      zone={zone}
      actions={actions}
      status={status}
    >
      {diff.kind === 'empty' ? (
        <div className={styles.emptyPlaceholder}>
          Paste or type two texts in Edit mode to compare.
        </div>
      ) : (
        <div className={`${styles.viewLayout} ${isCompact ? styles.viewLayoutCompact : ''}`}>
          {diff.hunks.map((hunk, idx) => (
            <div key={idx} className={styles.hunk}>
              {/* Left column */}
              <div className={`${styles.hunkColumn} ${styles.leftColumn} ${getHunkColumnClass(hunk.kind, 'left')}`}>
                {hunk.leftLine ? (
                  <>
                    <div className={styles.lineGutter}>
                      <span className={styles.lineNumber}>{hunk.leftLine.number}</span>
                      <span className={styles.changeMarker}>{getChangeMarker(hunk.kind, 'left')}</span>
                    </div>
                    <div className={styles.lineContent}>
                      {hunk.kind === 'modified' && hunk.leftLine.inline ? (
                        <InlineHighlight inline={hunk.leftLine.inline} />
                      ) : (
                        <span>{hunk.leftLine.text}</span>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Right column */}
              <div className={`${styles.hunkColumn} ${styles.rightColumn} ${getHunkColumnClass(hunk.kind, 'right')}`}>
                {hunk.rightLine ? (
                  <>
                    <div className={styles.lineGutter}>
                      <span className={styles.lineNumber}>{hunk.rightLine.number}</span>
                      <span className={styles.changeMarker}>{getChangeMarker(hunk.kind, 'right')}</span>
                    </div>
                    <div className={styles.lineContent}>
                      {hunk.kind === 'modified' && hunk.rightLine.inline ? (
                        <InlineHighlight inline={hunk.rightLine.inline} />
                      ) : (
                        <span>{hunk.rightLine.text}</span>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ToolFrame>
  );
};

function renderStatus(
  diff: DiffResult,
  left: string,
  _right: string,
): ReactNode {
  if (diff.kind === 'empty') {
    return (
      <ToolStatusPill status="neutral" detail="Idle">
        Idle
      </ToolStatusPill>
    );
  }

  const { stats, identical } = diff;

  if (identical) {
    const lineCount = left.split('\n').length;
    return (
      <ToolStatusPill status="ok" detail={`${lineCount} line${lineCount === 1 ? '' : 's'}`}>
        Identical
      </ToolStatusPill>
    );
  }

  const detail = `+${stats.added} · -${stats.removed} · ~${stats.modified}`;
  return (
    <ToolStatusPill status="ok" detail={detail}>
      Compared
    </ToolStatusPill>
  );
}

function getHunkColumnClass(kind: string, side: 'left' | 'right'): string {
  if (kind === 'unchanged') return styles.unchanged;
  if (kind === 'added') return side === 'left' ? styles.empty : styles.added;
  if (kind === 'removed') return side === 'left' ? styles.removed : styles.empty;
  if (kind === 'modified') return styles.modified;
  return '';
}

function getChangeMarker(kind: string, side: 'left' | 'right'): string {
  if (kind === 'unchanged') return '';
  if (kind === 'added') return side === 'right' ? '+' : '';
  if (kind === 'removed') return side === 'left' ? '−' : '';
  if (kind === 'modified') return '~';
  return '';
}

interface InlineHighlightProps {
  inline: Array<{ kind: string; text: string }>;
}

function InlineHighlight({ inline }: InlineHighlightProps) {
  return (
    <span>
      {inline.map((change, idx) => (
        <span
          key={idx}
          className={`${styles.inlineChange} ${styles[`inline${change.kind.charAt(0).toUpperCase()}${change.kind.slice(1)}`]}`}
          data-change-kind={change.kind}
        >
          {change.text}
        </span>
      ))}
    </span>
  );
}
