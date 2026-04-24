import { useCallback, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import {
  byteLength,
  formatYaml,
  toJson,
  validateYaml,
} from './lib';
import type { YamlValidateResult } from './lib';
import styles from './YamlValidator.module.css';

export interface YamlValidatorProps {
  toolId: string;
  zone?: Zone;
}

interface YamlValidatorState {
  /** Raw YAML text buffer. This is the single source of truth;
   *  parse result is always derived from it. */
  text: string;
}

const DEFAULT_STATE: YamlValidatorState = {
  text: '',
};

const SAMPLE_YAML = `mission: enterprise
registry: NCC-1701-D
crew: 1014
warp_factor: 9.6
decks:
  - 1
  - 2
  - 3`;

/**
 * YAML Validator — validates YAML, displays as YAML or JSON, formats on demand.
 *
 * The underlying buffer is always YAML (source of truth). The UI offers
 * a toggle between "YAML view" (raw buffer) and "JSON view" (read-only
 * round-tripped JSON representation).
 *
 * Parse result is recomputed on every render rather than stored, since
 * YAML parsing is fast enough for interactive editing.
 */
export const YamlValidator: FC<YamlValidatorProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<YamlValidatorState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';
  // In compact mode, always show YAML. In full mode, let user toggle.
  const [view, setView] = useState<'yaml' | 'json'>('yaml');

  // Derive validation on every render from the YAML buffer.
  const validation = useMemo<YamlValidateResult>(
    () => validateYaml(state.text),
    [state.text],
  );

  // Derive the JSON view (read-only) on every render. Recompute whenever
  // the YAML buffer changes.
  const jsonView = useMemo(() => {
    const result = toJson(state.text, 2);
    return result.kind === 'ok' ? result.text : null;
  }, [state.text]);

  const handleTextChange = useCallback(
    (text: string) => {
      setState({ text });
    },
    [setState],
  );

  const handleFormat = useCallback(() => {
    const result = formatYaml(state.text);
    if (result.kind === 'ok') {
      setState({ text: result.text });
    }
    // On error: leave the buffer alone. Status bar already flags the parse error.
  }, [state.text, setState]);

  const handleClear = useCallback(() => {
    setState({ text: '' });
  }, [setState]);

  const handleSample = useCallback(() => {
    setState({ text: SAMPLE_YAML });
  }, [setState]);

  const handleToggleView = useCallback(() => {
    setView(view === 'yaml' ? 'json' : 'yaml');
  }, [view]);

  const actions = (
    <>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={handleFormat}
        disabled={validation.kind !== 'ok'}
        aria-label="Format the YAML buffer"
      >
        Format
      </LcarsPill>
      {!isCompact && view === 'yaml' && jsonView ? (
        <LcarsPill
          size="medium"
          onClick={handleToggleView}
          aria-label="Switch to JSON view"
        >
          View as JSON
        </LcarsPill>
      ) : null}
      {!isCompact && view === 'json' && jsonView ? (
        <LcarsPill
          size="medium"
          onClick={handleToggleView}
          aria-label="Switch to YAML view"
        >
          View as YAML
        </LcarsPill>
      ) : null}
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={state.text.length === 0 ? handleSample : handleClear}
        aria-label={state.text.length === 0 ? 'Load a sample YAML document' : 'Clear the buffer'}
      >
        {state.text.length === 0 ? 'Sample' : 'Clear'}
      </LcarsPill>
    </>
  );

  const status = renderStatus(validation, state.text);

  // Determine what to display: YAML buffer or JSON view.
  const displayText = view === 'json' && jsonView ? jsonView : state.text;
  const isReadOnly = view === 'json';

  return (
    <ToolFrame
      toolId={toolId}
      title="YAML Validator"
      subtitle={
        isCompact
          ? undefined
          : 'Paste YAML, validate, format, and view as JSON.'
      }
      zone={zone}
      actions={actions}
      status={status}
    >
      <textarea
        className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
        value={displayText}
        onChange={(e) => !isReadOnly && handleTextChange(e.currentTarget.value)}
        placeholder="Paste YAML here. E.g. name: example"
        spellCheck={false}
        readOnly={isReadOnly}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={isReadOnly ? 'YAML as JSON (read-only)' : 'YAML input buffer'}
      />
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current validation result.
 * Kept outside the component for readability.
 */
function renderStatus(
  validation: YamlValidateResult,
  text: string,
): ReactNode {
  const bytes = byteLength(text);
  const sizeLabel = formatByteSize(bytes);
  const lineCount = text.length === 0 ? 0 : text.split('\n').length;

  if (validation.kind === 'empty') {
    return (
      <ToolStatusPill status="neutral" detail="Paste or type YAML to validate">
        Idle
      </ToolStatusPill>
    );
  }

  if (validation.kind === 'ok') {
    return (
      <>
        <ToolStatusPill
          status="ok"
          detail={`${lineCount} line${lineCount === 1 ? '' : 's'} · ${sizeLabel}`}
        >
          Valid
        </ToolStatusPill>
      </>
    );
  }

  // validation.kind === 'error'
  const loc =
    validation.line !== null && validation.column !== null
      ? `line ${validation.line}, col ${validation.column}`
      : 'position unknown';
  return (
    <>
      <ToolStatusPill status="error" detail={loc}>
        Parse error
      </ToolStatusPill>
      <span className={styles.errorMessage}>{validation.message}</span>
    </>
  );
}

/**
 * Bytes → B / KB / MB label.
 */
function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
