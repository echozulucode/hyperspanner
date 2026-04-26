import { useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import {
  cleanWhitespace,
  DEFAULT_OPTIONS,
  type WhitespaceCleanResult,
  type WhitespaceOptions,
} from './lib';
import styles from './WhitespaceClean.module.css';

export interface WhitespaceCleanProps {
  toolId: string;
  zone?: Zone;
}

interface WhitespaceCleanState {
  /** Raw text buffer. This is the single source of truth for the editor. */
  text: string;
  /** Toggle states for each cleaning rule. */
  options: WhitespaceOptions;
}

const DEFAULT_STATE: WhitespaceCleanState = {
  text: '',
  options: DEFAULT_OPTIONS,
};

/**
 * Whitespace Clean — strips, collapses, and normalizes whitespace.
 *
 * Follows the Phase 6.1 tool pattern with a pure-function lib.ts,
 * useTool state management, and zone-responsive layout.
 *
 * User workflow:
 *   1. Type or paste text into the input textarea.
 *   2. Toggle rules on/off via LcarsPill buttons in the header.
 *   3. The cleaned output appears instantly in the read-only output textarea.
 *   4. Status pill shows chars/lines removed.
 */
export const WhitespaceClean: FC<WhitespaceCleanProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<WhitespaceCleanState>(
    toolId,
    DEFAULT_STATE,
  );
  const isCompact = zone === 'right' || zone === 'bottom';

  // Derive cleaning result on every render. `text` and `options` are the free
  // variables, so memo-on-both is sufficient.
  const result = useMemo<WhitespaceCleanResult>(
    () => cleanWhitespace(state.text, state.options),
    [state.text, state.options],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setState({ text });
    },
    [setState],
  );

  const handleOptionToggle = useCallback(
    (key: keyof WhitespaceOptions) => {
      setState({
        options: {
          ...state.options,
          [key]: !state.options[key],
        },
      });
    },
    [state.options, setState],
  );

  const handleClear = useCallback(() => {
    setState({ text: '' });
  }, [setState]);

  const outputText =
    result.kind === 'ok' ? result.text : state.text;

  // In compact mode, show only the four core rules. In full mode, show all seven.
  const coreRules: Array<keyof WhitespaceOptions> = [
    'trimEnds',
    'trimLines',
    'collapseRuns',
    'collapseBlankLines',
    'normalizeEOL',
  ];

  const advancedRules: Array<keyof WhitespaceOptions> = [
    'tabsToSpaces',
    'stripBom',
  ];

  const rulesToShow = isCompact ? coreRules : [...coreRules, ...advancedRules];

  const actions = (
    <>
      {rulesToShow.map((rule) => (
        <LcarsPill
          key={rule}
          size="small"
          onClick={() => handleOptionToggle(rule)}
          aria-label={`Toggle ${rule} (currently ${state.options[rule] ? 'on' : 'off'})`}
          active={state.options[rule]}
        >
          {ruleLabelShort(rule)}
        </LcarsPill>
      ))}
      <LcarsPill
        size="small"
        onClick={handleClear}
        aria-label="Clear the buffer"
      >
        Clear
      </LcarsPill>
    </>
  );

  const status = renderStatus(state.text, result);

  return (
    <ToolFrame
      toolId={toolId}
      title="Whitespace Clean"
      subtitle="Strip, collapse, and normalize whitespace with granular rule toggles."
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={styles.editorContainer}>
        <div className={styles.inputSection}>
          {!isCompact && <div className={styles.sectionLabel}>Input</div>}
          <textarea
            className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
            value={state.text}
            onChange={(e) => handleTextChange(e.currentTarget.value)}
            placeholder="Paste or type text to clean..."
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Text input for whitespace cleaning"
          />
        </div>

        <div className={styles.gutter} />

        <div className={styles.outputSection}>
          {!isCompact && <div className={styles.sectionLabel}>Output</div>}
          <textarea
            className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
            value={outputText}
            readOnly
            placeholder="Cleaned text will appear here..."
            spellCheck={false}
            aria-label="Whitespace-cleaned text output"
          />
        </div>
      </div>
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current state.
 */
function renderStatus(text: string, result: WhitespaceCleanResult): ReactNode {
  if (text.trim().length === 0) {
    return (
      <ToolStatusPill status="neutral" detail="Paste or type text to clean">
        Idle
      </ToolStatusPill>
    );
  }

  if (result.kind === 'ok') {
    const charsRemoved = result.stats.charsBefore - result.stats.charsAfter;
    const linesRemoved = result.stats.linesBefore - result.stats.linesAfter;
    const detail =
      charsRemoved === 0 && linesRemoved === 0
        ? 'No changes'
        : `-${charsRemoved} char${charsRemoved === 1 ? '' : 's'} · -${linesRemoved} line${linesRemoved === 1 ? '' : 's'}`;

    return (
      <ToolStatusPill status="ok" detail={detail}>
        Ready
      </ToolStatusPill>
    );
  }

  // result.kind === 'empty' (shouldn't happen at this point, but be defensive)
  return (
    <ToolStatusPill status="neutral" detail="Processing...">
      Idle
    </ToolStatusPill>
  );
}

/**
 * Short label for each rule (used in compact mode).
 */
function ruleLabelShort(rule: keyof WhitespaceOptions): string {
  const labels: Record<keyof WhitespaceOptions, string> = {
    trimEnds: 'Trim Ends',
    trimLines: 'Trim Lines',
    collapseRuns: 'Collapse Runs',
    collapseBlankLines: 'Collapse Blanks',
    tabsToSpaces: 'Tabs→Spaces',
    normalizeEOL: 'Normalize EOL',
    stripBom: 'Strip BOM',
  };
  return labels[rule];
}
