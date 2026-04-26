import { useCallback, useMemo } from 'react';
import type { ChangeEvent, FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import { transformCase } from './lib';
import type { CaseMode, TransformResult } from './lib';
import styles from './CaseTransform.module.css';

export interface CaseTransformProps {
  toolId: string;
  zone?: Zone;
}

interface CaseTransformState {
  /** Raw text buffer. This is the single source of truth for the editor. */
  text: string;
  /** Currently selected case mode. */
  mode: CaseMode;
}

const DEFAULT_STATE: CaseTransformState = {
  text: '',
  mode: 'camelCase',
};

const CASE_MODES: CaseMode[] = [
  'camelCase',
  'PascalCase',
  'snake_case',
  'kebab-case',
  'CONSTANT_CASE',
  'lower case',
  'UPPER CASE',
];

/**
 * Case Transform — converts text between different case styles.
 *
 * Follows the Phase 6.1 tool pattern with a pure-function lib.ts,
 * useTool state management, and zone-responsive layout.
 *
 * User workflow:
 *   1. Type or paste text into the input textarea.
 *   2. Select a case mode from the pills in the header.
 *   3. The output appears instantly in the read-only output textarea.
 */
export const CaseTransform: FC<CaseTransformProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<CaseTransformState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  // Derive transformation on every render. `text` and `mode` are the free
  // variables, so memo-on-both is sufficient.
  const transformation = useMemo<TransformResult>(
    () => transformCase(state.text, state.mode),
    [state.text, state.mode],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setState({ text });
    },
    [setState],
  );

  const handleModeChange = useCallback(
    (mode: CaseMode) => {
      setState({ mode });
    },
    [setState],
  );

  const handleClear = useCallback(() => {
    setState({ text: '' });
  }, [setState]);

  const outputText =
    transformation.kind === 'ok' ? transformation.text : state.text;

  // Mode selection moved to a body-level `<select>` so the header
  // `actions` slot stays narrow. The previous 7 case-mode pills + Clear
  // (8 pills total) was unusable on medium-width screens — even at
  // `size="small"` the cluster wrapped to multiple header rows and ate
  // most of the body's vertical room. A single dropdown takes ~120px
  // and one row in the body, regardless of zone width. Clear stays in
  // the header as the only action.
  const handleModeSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      handleModeChange(e.currentTarget.value as CaseMode);
    },
    [handleModeChange],
  );

  const actions = (
    <LcarsPill
      size="small"
      onClick={handleClear}
      aria-label="Clear the buffer"
    >
      Clear
    </LcarsPill>
  );

  const status = renderStatus(state.text, transformation);

  return (
    <ToolFrame
      toolId={toolId}
      title="Case Transform"
      subtitle="Transform text between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, and space-separated forms."
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={`${styles.container} ${isCompact ? styles.containerCompact : ''}`}>
        <label className={styles.modeRow}>
          <span className={styles.modeLabel}>Mode</span>
          <select
            className={`${styles.modeSelect} ${isCompact ? styles.modeSelectCompact : ''}`}
            value={state.mode}
            onChange={handleModeSelect}
            aria-label="Case transformation mode"
          >
            {CASE_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.editorContainer}>
          <div className={styles.inputSection}>
            {!isCompact && <div className={styles.sectionLabel}>Input</div>}
            <textarea
              className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
              value={state.text}
              onChange={(e) => handleTextChange(e.currentTarget.value)}
              placeholder="Paste or type text to transform..."
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Text input for case transformation"
            />
          </div>

          <div className={styles.outputSection}>
            {!isCompact && <div className={styles.sectionLabel}>Output</div>}
            <textarea
              className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
              value={outputText}
              readOnly
              placeholder="Transformed text will appear here..."
              spellCheck={false}
              aria-label="Case-transformed text output"
            />
          </div>
        </div>
      </div>
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current state.
 */
function renderStatus(text: string, transformation: TransformResult): ReactNode {
  if (text.trim().length === 0) {
    return (
      <ToolStatusPill status="neutral" detail="Enter text to transform">
        Idle
      </ToolStatusPill>
    );
  }

  if (transformation.kind === 'ok') {
    const tokens = text.trim().split(/[\s_\-]+/).filter((t) => t.length > 0);
    const tokenCount = tokens.length;
    const charCount = text.length;
    return (
      <ToolStatusPill
        status="ok"
        detail={`${tokenCount} token${tokenCount === 1 ? '' : 's'} · ${charCount} char${charCount === 1 ? '' : 's'}`}
      >
        Ready
      </ToolStatusPill>
    );
  }

  return (
    <ToolStatusPill status="neutral" detail="Processing...">
      Transforming
    </ToolStatusPill>
  );
}
