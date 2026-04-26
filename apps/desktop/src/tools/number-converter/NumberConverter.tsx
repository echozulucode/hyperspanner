import { useCallback, useMemo } from 'react';
import type { ChangeEvent, FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import {
  BYTE_COUNT,
  bytesToDecimal,
  decimalToBytes,
  formatBinary,
  formatHex,
  isEndianAgnostic,
  parseHex,
  TYPES,
} from './lib';
import type { Endianness, NumberType } from './lib';
import styles from './NumberConverter.module.css';

export interface NumberConverterProps {
  toolId: string;
  zone?: Zone;
}

interface NumberConverterState {
  endianness: Endianness;
  type: NumberType;
  /** Last hex string the user typed. Sticky display when `lastEdited === 'hex'`. */
  hexInput: string;
  /** Last decimal string the user typed. Sticky display when `lastEdited === 'decimal'`. */
  decimalInput: string;
  lastEdited: 'hex' | 'decimal';
}

const DEFAULT_STATE: NumberConverterState = {
  endianness: 'big',
  type: 'uint32',
  hexInput: '',
  decimalInput: '',
  lastEdited: 'hex',
};

const ENDIAN_LABELS: Record<Endianness, string> = {
  big: 'Big Endian',
  little: 'Little Endian',
};

/**
 * Number Converter — bidirectional hex ↔ decimal value editor with a
 * binary read-out, built on the standard tool-pattern.
 *
 * Layout:
 *   Endianness  [Big Endian ▾]    Type  [int32 ▾]
 *
 *   Hex
 *   [ 12 34 56 78                              ]
 *   Decimal
 *   [ 305419896                                ]
 *
 *   Binary  0001_0010 0011_0100 0101_0110 0111_1000
 *
 * Editing either Hex or Decimal makes it the "sticky" side; the other is
 * derived through a Uint8Array and stays in sync. Endianness only affects
 * how multi-byte values are interpreted; bytes are always shown left-to-
 * right in typing/memory order.
 */
export const NumberConverter: FC<NumberConverterProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<NumberConverterState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  // Derive the canonical bytes (and any parse error) from whichever side
  // the user last touched. Memoized over the inputs that actually drive
  // the result so we don't redo the parse on every keystroke in another
  // unrelated field.
  const derived = useMemo(() => {
    const expected = BYTE_COUNT[state.type];
    if (state.lastEdited === 'hex') {
      const r = parseHex(state.hexInput, expected);
      if (r.kind === 'error') {
        return { bytes: new Uint8Array(expected), error: r.message } as const;
      }
      return { bytes: r.bytes, error: null } as const;
    }
    const r = decimalToBytes(state.decimalInput, state.type, state.endianness);
    if (r.kind === 'error') {
      return { bytes: new Uint8Array(expected), error: r.message } as const;
    }
    return { bytes: r.bytes, error: null } as const;
  }, [
    state.hexInput,
    state.decimalInput,
    state.type,
    state.endianness,
    state.lastEdited,
  ]);

  // When the sticky input is empty, every dependent display goes blank too
  // — otherwise an empty hex field would render the derived decimal as
  // "0" (since parseHex('', N) returns all-zero bytes), which feels like
  // we put data there when the user didn't.
  const stickyValue =
    state.lastEdited === 'hex' ? state.hexInput : state.decimalInput;
  const stickyIsEmpty = stickyValue.trim().length === 0;

  // Display values — sticky side echoes the user's typing verbatim; the
  // derived side mirrors the canonical bytes (or stays blank when the
  // sticky side is empty or when there's a parse error so we don't show
  // stale values alongside an error pill).
  const displayHex =
    state.lastEdited === 'hex'
      ? state.hexInput
      : derived.error || stickyIsEmpty
        ? ''
        : formatHex(derived.bytes);

  const displayDecimal =
    state.lastEdited === 'decimal'
      ? state.decimalInput
      : derived.error || stickyIsEmpty
        ? ''
        : bytesToDecimal(derived.bytes, state.type, state.endianness);

  const displayBinary =
    derived.error || stickyIsEmpty ? '' : formatBinary(derived.bytes);

  /* ---------- Handlers ---------- */

  const handleHexChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setState({ hexInput: e.currentTarget.value, lastEdited: 'hex' });
    },
    [setState],
  );

  const handleDecimalChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setState({ decimalInput: e.currentTarget.value, lastEdited: 'decimal' });
    },
    [setState],
  );

  const handleEndiannessChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setState({ endianness: e.currentTarget.value as Endianness });
    },
    [setState],
  );

  const handleTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setState({ type: e.currentTarget.value as NumberType });
    },
    [setState],
  );

  const handleClear = useCallback(() => {
    setState({ hexInput: '', decimalInput: '', lastEdited: 'hex' });
  }, [setState]);

  const handleSwap = useCallback(() => {
    // Flip endianness — keep the sticky side, the other will recompute.
    setState({ endianness: state.endianness === 'big' ? 'little' : 'big' });
  }, [state.endianness, setState]);

  const actions = (
    <>
      <LcarsPill
        size="small"
        onClick={handleSwap}
        aria-label="Swap endianness"
      >
        Swap Endian
      </LcarsPill>
      <LcarsPill
        size="small"
        onClick={handleClear}
        aria-label="Clear inputs"
      >
        Clear
      </LcarsPill>
    </>
  );

  const status = renderStatus(state, derived.error, displayHex, displayDecimal);

  return (
    <ToolFrame
      toolId={toolId}
      title="Number Converter"
      subtitle="Bidirectional hex ↔ decimal editor with a binary read-out. Pick a type and an endianness; type either field — the other follows."
      zone={zone}
      actions={actions}
      status={status}
    >
      <div
        className={`${styles.container} ${isCompact ? styles.containerCompact : ''}`}
      >
        <div className={styles.controls}>
          <label className={styles.controlGroup}>
            <span className={styles.controlLabel}>Endianness</span>
            <select
              className={styles.select}
              value={state.endianness}
              onChange={handleEndiannessChange}
              disabled={isEndianAgnostic(state.type)}
              aria-label="Endianness selector"
              title={
                isEndianAgnostic(state.type)
                  ? 'Endianness has no effect on single-byte types'
                  : 'Choose how multi-byte values are interpreted'
              }
            >
              <option value="big">{ENDIAN_LABELS.big}</option>
              <option value="little">{ENDIAN_LABELS.little}</option>
            </select>
          </label>

          <label className={styles.controlGroup}>
            <span className={styles.controlLabel}>Type</span>
            <select
              className={styles.select}
              value={state.type}
              onChange={handleTypeChange}
              aria-label="Numeric type selector"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Hex</span>
            <input
              type="text"
              className={`${styles.input} ${isCompact ? styles.inputCompact : ''} ${
                state.lastEdited === 'hex' && derived.error ? styles.inputError : ''
              }`}
              value={displayHex}
              onChange={handleHexChange}
              placeholder={`${BYTE_COUNT[state.type]}-byte hex`}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Hex value input"
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Decimal</span>
            <input
              type="text"
              className={`${styles.input} ${isCompact ? styles.inputCompact : ''} ${
                state.lastEdited === 'decimal' && derived.error
                  ? styles.inputError
                  : ''
              }`}
              value={displayDecimal}
              onChange={handleDecimalChange}
              placeholder={exampleDecimalPlaceholder(state.type)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Decimal value input"
            />
          </div>
        </div>

        <div className={styles.binaryRow}>
          <span className={styles.fieldLabel}>Binary</span>
          <output
            className={`${styles.binaryValue} ${isCompact ? styles.binaryValueCompact : ''}`}
          >
            {displayBinary || (
              <span className={styles.binaryPlaceholder}>
                {`${BYTE_COUNT[state.type] * 8}-bit binary representation appears here`}
              </span>
            )}
          </output>
        </div>
      </div>
    </ToolFrame>
  );
};

/* ---------- Status footer ---------- */

function renderStatus(
  state: NumberConverterState,
  error: string | null,
  hex: string,
  decimal: string,
): ReactNode {
  if (error) {
    const detail = `${state.type} · ${state.endianness}-endian`;
    return (
      <ToolStatusPill status="error" detail={detail}>
        {error}
      </ToolStatusPill>
    );
  }

  // No content yet on either side → idle.
  if (hex.replace(/[\s_]/g, '').length === 0 && decimal.trim().length === 0) {
    return (
      <ToolStatusPill status="neutral" detail="Type hex or decimal to begin">
        Idle
      </ToolStatusPill>
    );
  }

  const detail = `${state.type} · ${state.endianness}-endian · ${BYTE_COUNT[state.type]} byte${
    BYTE_COUNT[state.type] === 1 ? '' : 's'
  }`;
  return (
    <ToolStatusPill status="ok" detail={detail}>
      Ready
    </ToolStatusPill>
  );
}

/* ---------- Placeholder helpers ---------- */

// `exampleHex` was used to seed the hex input's placeholder with a per-
// type sample string (e.g. `12 34 56 78` for uint32). It got replaced
// with a shorter `"4-byte hex"`-style hint as part of the small-screen
// pass so the placeholder fits the half-width input column without
// truncation; the function is no longer wired up.

function exampleDecimalPlaceholder(type: NumberType): string {
  if (type === 'float32' || type === 'float64') return '3.14159';
  if (type.startsWith('int')) return 'e.g. -42';
  return 'e.g. 42';
}
