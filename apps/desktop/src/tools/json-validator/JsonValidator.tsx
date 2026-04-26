import { useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import {
  byteLength,
  formatJson,
  minifyJson,
  validateJson,
} from './lib';
import type { JsonValidateResult } from './lib';
import styles from './JsonValidator.module.css';

export interface JsonValidatorProps {
  toolId: string;
  zone?: Zone;
}

interface JsonValidatorState {
  /** Raw text buffer. This is the single source of truth for the editor;
   *  parse result is always derived from it and never stored. */
  text: string;
  /** Pretty-print indent, 2 or 4 spaces are the common defaults. We store
   *  it in tool state so the user's preference sticks across tab switches
   *  within a session. */
  indent: 2 | 4;
}

const DEFAULT_STATE: JsonValidatorState = {
  text: '',
  indent: 2,
};

const SAMPLE_JSON = `{
  "mission": "enterprise",
  "registry": "NCC-1701-D",
  "crew": 1014,
  "warp_factor": 9.6,
  "decks": [1, 2, 3]
}`;

/**
 * JSON Validator — the Phase 6.1 vertical slice tool.
 *
 * Serves two masters:
 *   1. User: paste JSON, get instant "valid / error at line:col" feedback,
 *      plus Format and Minify buttons that operate on the buffer in place.
 *   2. Future tools: establishes the shape the other twelve Phase 6 tools
 *      land on — `useTool` for per-instance state, `ToolFrame` for chrome,
 *      a pure-function `lib.ts` for logic, zone-responsive compact vs full
 *      body. See `docs/tool-pattern.md`.
 *
 * The parse result is recomputed on every render rather than stored. With
 * a 64 MiB upper bound on input (enforced by the future load-from-file
 * path; no bound on paste), JSON.parse is fast enough that memoizing it
 * against the buffer is more than enough — no need to async it out.
 */
export const JsonValidator: FC<JsonValidatorProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<JsonValidatorState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  // Derive validation on every render. `text` is the only free variable,
  // so memo-on-text is sufficient and keeps re-renders cheap for the
  // (common) case where the user is typing in the indent control instead.
  const validation = useMemo<JsonValidateResult>(
    () => validateJson(state.text),
    [state.text],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setState({ text });
    },
    [setState],
  );

  const handleFormat = useCallback(() => {
    const result = formatJson(state.text, state.indent);
    if (result.kind === 'ok') {
      setState({ text: result.text });
    }
    // On error: leave the buffer alone. The status bar already renders the
    // parse error — rewriting the buffer to something else would be
    // destructive. This mirrors how VS Code's Format Document behaves on
    // an unparseable file: it refuses silently and flags the error.
  }, [state.text, state.indent, setState]);

  const handleMinify = useCallback(() => {
    const result = minifyJson(state.text);
    if (result.kind === 'ok') {
      setState({ text: result.text });
    }
  }, [state.text, setState]);

  const handleClear = useCallback(() => {
    setState({ text: '' });
  }, [setState]);

  const handleSample = useCallback(() => {
    setState({ text: SAMPLE_JSON });
  }, [setState]);

  const handleIndentToggle = useCallback(() => {
    // Partial-merge form here: the function form of `setState` expects
    // the full `T` back, and we only want to change `indent`. Using the
    // partial form keeps `text` untouched without having to quote it
    // through from the previous state.
    setState(state.indent === 2 ? { indent: 4 } : { indent: 2 });
  }, [state.indent, setState]);

  const actions = (
    <>
      <LcarsPill
        size="small"
        onClick={handleFormat}
        disabled={validation.kind !== 'ok'}
        aria-label="Pretty-print the JSON buffer"
      >
        Format
      </LcarsPill>
      <LcarsPill
        size="small"
        onClick={handleMinify}
        disabled={validation.kind !== 'ok'}
        aria-label="Strip whitespace from the JSON buffer"
      >
        Minify
      </LcarsPill>
      {!isCompact ? (
        <LcarsPill
          size="medium"
          onClick={handleIndentToggle}
          aria-label={`Toggle indent (currently ${state.indent} spaces)`}
        >
          Indent {state.indent}
        </LcarsPill>
      ) : null}
      <LcarsPill
        size="small"
        onClick={state.text.length === 0 ? handleSample : handleClear}
        aria-label={state.text.length === 0 ? 'Load a sample JSON document' : 'Clear the buffer'}
      >
        {state.text.length === 0 ? 'Sample' : 'Clear'}
      </LcarsPill>
    </>
  );

  const status = renderStatus(validation, state.text);

  return (
    <ToolFrame
      toolId={toolId}
      title="JSON Validator"
      subtitle="Paste JSON, get parse feedback with line and column. Format and minify operate on the buffer when it parses."
      zone={zone}
      actions={actions}
      status={status}
    >
      <textarea
        className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
        value={state.text}
        onChange={(e) => handleTextChange(e.currentTarget.value)}
        placeholder='Paste JSON here. E.g. {"a": 1}'
        spellCheck={false}
        // We don't set rows/cols; the CSS controls size and flex layout.
        // autoComplete etc. disabled because none of them help for code.
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="JSON input buffer"
      />
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current validation result.
 * Kept outside the component for readability — the branchy render logic
 * doesn't touch hooks, so there's no reason to keep it inline.
 */
function renderStatus(
  validation: JsonValidateResult,
  text: string,
): ReactNode {
  const bytes = byteLength(text);
  const sizeLabel = formatByteSize(bytes);
  const lineCount = text.length === 0 ? 0 : text.split('\n').length;

  if (validation.kind === 'empty') {
    return (
      <ToolStatusPill status="neutral" detail="Paste or type JSON to validate">
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
 * Bytes → B / KB / MB label. Uses 1024-based units (matches most file-
 * browser conventions) and one decimal place past 1 KB. Not worth a
 * dependency.
 */
function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
