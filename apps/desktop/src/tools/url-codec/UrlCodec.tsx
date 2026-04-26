import { useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import { decodeUrl, encodeUrl } from './lib';
import type { UrlCodecMode, PlusMode, UrlDecodeResult, UrlEncodeResult } from './lib';
import styles from './UrlCodec.module.css';

export interface UrlCodecProps {
  toolId: string;
  zone?: Zone;
}

interface UrlCodecState {
  /** Raw text buffer — the single source of truth for the input editor. */
  input: string;
  /** Currently selected direction: encode or decode. */
  direction: 'encode' | 'decode';
  /** URL encoding mode: component or uri. */
  mode: UrlCodecMode;
  /** Plus handling: standard (%20) or plus-as-space (+). */
  plusMode: PlusMode;
}

const DEFAULT_STATE: UrlCodecState = {
  input: '',
  direction: 'encode',
  mode: 'component',
  plusMode: 'standard',
};

/**
 * URL Codec — bidirectional URL encoding / decoding with two modes.
 *
 * Follows the Phase 6.1 tool pattern: pure-function lib.ts, useTool state,
 * zone-responsive layout.
 *
 * User workflow:
 *   1. Type or paste into the input textarea.
 *   2. Select direction (encode/decode), mode (component/uri), and plus
 *      handling (standard/%20 or plus-as-space/+) via toggles.
 *   3. The output appears instantly in the read-only output textarea.
 *   4. Click the direction-flip arrow to swap input ↔ output and toggle
 *      direction, keeping both buffers.
 */
export const UrlCodec: FC<UrlCodecProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<UrlCodecState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  // Derive the transformation on every render based on input, direction, and
  // options. Text, direction, and options are free variables; memoization
  // on these keeps re-renders cheap.
  const result = useMemo(
    () => {
      const options = { mode: state.mode, plusMode: state.plusMode };
      if (state.direction === 'encode') {
        return encodeUrl(state.input, options);
      } else {
        return decodeUrl(state.input, options);
      }
    },
    [state.input, state.direction, state.mode, state.plusMode],
  );

  const handleInputChange = useCallback(
    (input: string) => {
      setState({ input });
    },
    [setState],
  );

  const handleDirectionToggle = useCallback(() => {
    // Flip direction and swap input with output.
    // Output text is derived; use empty if the result isn't ok.
    const outputText =
      result.kind === 'ok'
        ? result.text
        : result.kind === 'empty'
          ? ''
          : state.input; // On error, leave input unchanged.

    setState({
      input: outputText,
      direction: state.direction === 'encode' ? 'decode' : 'encode',
    });
  }, [state.input, state.direction, result, setState]);

  const handleDirectionChange = useCallback(
    (dir: 'encode' | 'decode') => {
      setState({ direction: dir });
    },
    [setState],
  );

  const handleModeChange = useCallback(
    (mode: UrlCodecMode) => {
      setState({ mode });
    },
    [setState],
  );

  const handlePlusModeChange = useCallback(
    (pm: PlusMode) => {
      setState({ plusMode: pm });
    },
    [setState],
  );

  const handleClear = useCallback(() => {
    setState({ input: '' });
  }, [setState]);

  // Derive output text from the result.
  const outputText =
    result.kind === 'ok'
      ? result.text
      : result.kind === 'empty'
        ? ''
        : state.input; // On error, show the input so user can debug.

  const actions = (
    <>
      {/* Direction toggle: encode / decode */}
      <LcarsPill
        size="small"
        onClick={() =>
          handleDirectionChange(state.direction === 'encode' ? 'decode' : 'encode')
        }
        disabled={state.direction === 'encode'}
        aria-label="Encode mode"
      >
        Encode
      </LcarsPill>
      <LcarsPill
        size="small"
        onClick={() =>
          handleDirectionChange(state.direction === 'decode' ? 'encode' : 'decode')
        }
        disabled={state.direction === 'decode'}
        aria-label="Decode mode"
      >
        Decode
      </LcarsPill>

      {/* Mode toggle: component / uri */}
      <LcarsPill
        size="small"
        onClick={() => handleModeChange(state.mode === 'component' ? 'uri' : 'component')}
        disabled={state.mode === 'component'}
        aria-label="Component mode (encodes all reserved chars)"
      >
        Component
      </LcarsPill>
      <LcarsPill
        size="small"
        onClick={() => handleModeChange(state.mode === 'uri' ? 'component' : 'uri')}
        disabled={state.mode === 'uri'}
        aria-label="URI mode (preserves URI separators)"
      >
        URI
      </LcarsPill>

      {/* Plus handling: standard / plus-as-space */}
      <LcarsPill
        size="small"
        onClick={() =>
          handlePlusModeChange(state.plusMode === 'standard' ? 'plus-as-space' : 'standard')
        }
        disabled={state.plusMode === 'standard'}
        aria-label="Standard space encoding (%20)"
      >
        %20
      </LcarsPill>
      <LcarsPill
        size="small"
        onClick={() =>
          handlePlusModeChange(state.plusMode === 'plus-as-space' ? 'standard' : 'plus-as-space')
        }
        disabled={state.plusMode === 'plus-as-space'}
        aria-label="Plus-as-space mode (form data)"
      >
        +
      </LcarsPill>

      {/* Direction flip: swap input ↔ output, toggle direction */}
      <LcarsPill
        size="small"
        onClick={handleDirectionToggle}
        aria-label="Flip direction: swap input and output, toggle encode/decode"
      >
        ⇅ Flip
      </LcarsPill>

      {/* Clear input */}
      <LcarsPill
        size="small"
        onClick={handleClear}
        aria-label="Clear the input buffer"
      >
        Clear
      </LcarsPill>
    </>
  );

  const status = renderStatus(state.input, result);

  return (
    <ToolFrame
      toolId={toolId}
      title="URL Codec"
      subtitle="Encode and decode URL-encoded strings. Toggle between component mode (escapes all reserved chars) and URI mode (preserves separators), plus %20 vs + for spaces."
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={styles.editorContainer}>
        <div className={styles.inputSection}>
          {!isCompact && <div className={styles.sectionLabel}>Input</div>}
          <textarea
            className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
            value={state.input}
            onChange={(e) => handleInputChange(e.currentTarget.value)}
            placeholder="Paste or type text to encode/decode..."
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="URL codec input buffer"
          />
        </div>

        <div className={styles.gutter} />

        <div className={styles.outputSection}>
          {!isCompact && <div className={styles.sectionLabel}>Output</div>}
          <textarea
            className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
            value={outputText}
            readOnly
            placeholder="Encoded or decoded text will appear here..."
            spellCheck={false}
            aria-label="URL codec output buffer"
          />
        </div>
      </div>
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current result.
 */
function renderStatus(input: string, result: UrlEncodeResult | UrlDecodeResult): ReactNode {
  if (input.trim().length === 0) {
    return (
      <ToolStatusPill status="neutral" detail="Enter text to encode or decode">
        Idle
      </ToolStatusPill>
    );
  }

  if (result.kind === 'ok') {
    return (
      <ToolStatusPill
        status="ok"
        detail={`${input.length} char${input.length === 1 ? '' : 's'} → ${result.text.length} char${result.text.length === 1 ? '' : 's'}`}
      >
        OK
      </ToolStatusPill>
    );
  }

  if (result.kind === 'error') {
    const detail =
      result.offset !== null
        ? `${result.message} at offset ${result.offset}`
        : result.message;
    return (
      <ToolStatusPill status="error" detail={detail}>
        Error
      </ToolStatusPill>
    );
  }

  // kind === 'empty'
  return (
    <ToolStatusPill status="neutral" detail="Waiting for input">
      Idle
    </ToolStatusPill>
  );
}
