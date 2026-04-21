import type { CSSProperties, FC, ReactNode } from 'react';
import styles from './LcarsPanel.module.css';

export interface LcarsPanelProps {
  /** Number displayed in the LCARS decorative style (e.g. "01-FAVORITES"). */
  number?: string;
  /** Sub-label appended after the number. */
  label?: string;
  /** Override the background color. Falls back to `--lcars-color-red`. */
  color?: string;
  /** Explicit height (overrides size). */
  height?: string;
  /** Fixed-ratio size variant; mirrors the reference panelNumber slots. */
  size?: 1 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsPanel — rectangular sidebar block. Stack these in the left rail.
 * Text anchors bottom-right per LCARS layout grammar.
 */
export const LcarsPanel: FC<LcarsPanelProps> = ({
  number,
  label,
  color,
  height,
  size,
  onClick,
  children,
  className = '',
  style = {},
}) => {
  const isClickable = Boolean(onClick);
  const sizeClass = size ? styles[`panel${size}` as keyof typeof styles] : '';

  const panelStyle: CSSProperties = {
    ...style,
    ...(color ? ({ '--panel-color': color } as CSSProperties) : {}),
    ...(height ? { height } : {}),
  };

  const content =
    number != null ? (
      <>
        {number}
        {label ? <span className={styles.labelSmall}>-{label}</span> : null}
      </>
    ) : (
      children
    );

  const classNames = [
    styles.panel,
    sizeClass,
    isClickable && styles.clickable,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (isClickable) {
    return (
      <button type="button" className={classNames} style={panelStyle} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={classNames} style={panelStyle}>
      {content}
    </div>
  );
};
