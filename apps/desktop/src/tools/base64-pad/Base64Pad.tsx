import { useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import { decodeBase64, encodeBase64 } from './lib';
import type { Base64Options, Base64Padding, Base64Variant, DecodeResult, EncodeResult } from './lib';
import styles from './Base64Pad.module.css';

export interface Base64PadProps {
  toolId: string;
  zone?: Zone;
}

interface Base64PadState {
  /** Raw text buffer (editable by user). */
  input: string;
  /** Direction of transformation. */
  direction: 'encode' | 'decode';
  /** Base64 variant: standard or URL-safe. */
  variant: Base64Variant;
  /** Padding mode: keep or strip. */
  padding: Base64Padding;
}

const DEFAULT_STATE: Base64PadState = {
  input: '',
  direction: 'encode',
  variant: 'standard',
  padding: 'pad',
};

/**
 * Base64 Pad — encode/decode text ↔ base64.
 *
 * Follows the Phase 6.2 tool pattern with two buffers (input/output).
 * When the user flips direction, the current output moves into the input
 * slot so they can feed back the result.
 *
 * Key behavior:
 *   - input: user-editable textarea
 *   - output: derived from input + (direction + variant + padding) options
 *   - direction flip: copy output→input, clear output, flip direction
 *   - padding only meaningful on encode; decode accepts both
 */
export const Base64Pad: FC<Base64PadProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<Base64PadState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  // Derive the transformation result on every render.
  const transformResult = useMemo(() => {
    const options: Base64Options = {
      variant: state.variant,
      padding: state.padding,
    };

    if (state.direction === 'encode') {
      return encodeBase64(state.input, options);
    } else {
      return decodeBase64(state.input, options);
    }
  }, [state.input, state.direction, state.variant, state.padding]);

  // Extract output text from the result.
  const outputText =
    transformResult.kind === 'ok' ? transformResult.text : '';

  const handleInputChange = useCallback(
    (input: string) => {
      setState({ input });
    },
    [setState],
  );

  const handleDirectionFlip = useCallback(() => {
    // When flipping direction: move output into input slot
    const newInput = outputText;
    const newDirection = state.direction === 'encode' ? 'decode' : 'encode';
    setState({ input: newInput, direction: newDirection });
  }, [outputText, state.direction, setState]);

  const handleVariantChange = useCallback(
    (variant: Base64Variant) => {
      setState({ variant });
    },
    [setState],
  );

  const handlePaddingChange = useCallback(
    (padding: Base64Padding) => {
      setState({ padding });
    },
    [setState],
  );

  const handleClear = useCallback(() => {
    setState({ input: '' });
  }, [setState]);

  const actions = (
    <>
      <LcarsPill
        size="small"
        onClick={handleDirectionFlip}
        aria-label={`Toggle direction (currently ${state.direction})`}
      >
        {state.direction === 'encode' ? 'To Base64' : 'From Base64'}
      </LcarsPill>
      <LcarsPill
        size="small"
        onClick={() => handleVariantChange(state.variant === 'standard' ? 'url-safe' : 'standard')}
        aria-label={`Toggle variant (currently ${state.variant})`}
      >
        {state.variant === 'standard' ? 'Standard' : 'URL-Safe'}
      </LcarsPill>
      {state.direction === 'encode' && (
        <LcarsPill
          size="small"
          onClick={() => handlePaddingChange(state.padding === 'pad' ? 'strip' : 'pad')}
          aria-label={`Toggle padding (currently ${state.padding})`}
        >
          {state.padding === 'pad' ? 'Padded' : 'Unpadded'}
        </LcarsPill>
      )}
      <LcarsPill
        size="small"
        onClick={handleClear}
        aria-label="Clear the buffer"
      >
        Clear
      </LcarsPill>
    </>
  );

  const status = renderStatus(state.input, transformResult, state.direction);

  return (
    <ToolFrame
      toolId={toolId}
      title="Base64 Pad"
      subtitle={
        state.direction === 'encode'
          ? 'Encode text to base64. Choose standard or URL-safe variant and padding mode.'
          : 'Decode base64 to text. Accepts both standard and URL-safe input.'
      }
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={styles.editorContainer}>
        <div className={styles.inputSection}>
          {!isCompact && <div className={styles.sectionLabel}>
            {state.direction === 'encode' ? 'Input (Text)' : 'Input (Base64)'}
          </div>}
          <textarea
            className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
            value={state.input}
            onChange={(e) => handleInputChange(e.currentTarget.value)}
            placeholder={
              state.direction === 'encode'
                ? 'Paste or type text to encode...'
                : 'Paste or type base64 to decode...'
            }
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={state.direction === 'encode' ? 'Text to encode' : 'Base64 to decode'}
          />
        </div>

        <div className={styles.outputSection}>
          {!isCompact && <div className={styles.sectionLabel}>
            {state.direction === 'encode' ? 'Output (Base64)' : 'Output (Text)'}
          </div>}
          <textarea
            className={`${styles.editor} ${isCompact ? styles.editorCompact : ''}`}
            value={outputText}
            readOnly
            placeholder={
              state.direction === 'encode'
                ? 'Base64 output will appear here...'
                : 'Decoded text will appear here...'
            }
            spellCheck={false}
            aria-label={state.direction === 'encode' ? 'Base64 output' : 'Decoded text output'}
          />
        </div>
      </div>
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current transformation result.
 */
function renderStatus(
  input: string,
  result: EncodeResult | DecodeResult,
  _direction: string,
): ReactNode {
  if (result.kind === 'empty') {
    return (
      <ToolStatusPill status="neutral" detail="Paste or type to get started">
        Idle
      </ToolStatusPill>
    );
  }

  if (result.kind === 'ok') {
    const inputSize = input.length;
    const outputSize = result.bytes;
    const detail = `${inputSize} chars → ${outputSize} bytes`;
    return (
      <ToolStatusPill status="ok" detail={detail}>
        OK
      </ToolStatusPill>
    );
  }

  // result.kind === 'error'
  return (
    <ToolStatusPill status="error" detail={result.message}>
      Error
    </ToolStatusPill>
  );
}
