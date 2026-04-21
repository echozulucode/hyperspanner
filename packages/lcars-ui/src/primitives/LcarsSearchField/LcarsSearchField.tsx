import { forwardRef, useRef } from 'react';
import type {
  ChangeEvent,
  CSSProperties,
  ForwardedRef,
  KeyboardEvent,
} from 'react';
import styles from './LcarsSearchField.module.css';

export interface LcarsSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Uppercase label shown left of the input (e.g. "QUERY"). */
  prefix?: string;
  placeholder?: string;
  /** Optional keyboard-shortcut hint shown on the right (e.g. "⌘K"). */
  shortcut?: string;
  /** Show the clear button. Defaults to true when value is non-empty. */
  showClear?: boolean;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

/**
 * LcarsSearchField — search/query input styled as an LCARS pill.
 * Used in the command palette and any tool filter input.
 */
export const LcarsSearchField = forwardRef(function LcarsSearchField(
  {
    value,
    onChange,
    prefix = 'QUERY',
    placeholder = 'Search…',
    shortcut,
    showClear,
    onSubmit,
    onCancel,
    autoFocus = false,
    className = '',
    style = {},
    'aria-label': ariaLabel,
  }: LcarsSearchFieldProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const internalRef = useRef<HTMLInputElement | null>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    internalRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSubmit?.(value);
    } else if (event.key === 'Escape') {
      onCancel?.();
    }
  };

  const handleClear = () => {
    onChange('');
    internalRef.current?.focus();
  };

  const shouldShowClear = showClear ?? value.length > 0;
  const classNames = [styles.field, className].filter(Boolean).join(' ');

  return (
    <div className={classNames} style={style}>
      {prefix && <span className={styles.prefix}>{prefix}</span>}
      <input
        ref={setRefs}
        type="search"
        className={styles.input}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? prefix}
        spellCheck={false}
        autoComplete="off"
      />
      {shouldShowClear ? (
        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="Clear"
        >
          ×
        </button>
      ) : shortcut ? (
        <span className={styles.kbd} aria-hidden="true">
          {shortcut}
        </span>
      ) : null}
    </div>
  );
});
