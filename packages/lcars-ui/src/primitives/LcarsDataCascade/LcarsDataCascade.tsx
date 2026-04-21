import { useMemo } from 'react';
import type { CSSProperties, FC } from 'react';
import styles from './LcarsDataCascade.module.css';

export interface LcarsDataCascadeProps {
  /** Number of columns to render. */
  columns?: number;
  /** Rows per column. */
  rows?: number;
  /** Enable flicker animations (cycle through reference keyframes). */
  animated?: boolean;
  /** Primary color for active digits. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsDataCascade — the telemetry / status-readout column block that
 * fills the banner row in a standard LCARS frame. Ported from the
 * reference lcars-example with identical keyframes for authenticity.
 */
export const LcarsDataCascade: FC<LcarsDataCascadeProps> = ({
  columns = 14,
  rows = 9,
  animated = true,
  color,
  className = '',
  style = {},
}) => {
  const data = useMemo(() => {
    const result: string[][] = [];
    for (let c = 0; c < columns; c += 1) {
      const column: string[] = [];
      for (let r = 0; r < rows; r += 1) {
        const length =
          Math.random() < 0.3
            ? Math.floor(Math.random() * 3) + 2
            : Math.floor(Math.random() * 5) + 5;
        const n = Math.floor(Math.random() * 10 ** length)
          .toString()
          .padStart(length, '0');
        column.push(n);
      }
      result.push(column);
    }
    return result;
  }, [columns, rows]);

  const wrapperStyle: CSSProperties = {
    ...style,
    ...(color ? ({ '--data-cascade-color': color } as CSSProperties) : {}),
  };

  const classes = [
    styles.wrapper,
    !animated && styles.frozen,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={wrapperStyle} aria-hidden="true">
      {data.map((column, ci) => (
        <div key={ci} className={styles.column}>
          {column.map((value, ri) => (
            <div
              key={ri}
              className={`${styles.row} ${styles[`row${(ri % 7) + 1}` as keyof typeof styles]}`}
            >
              {value}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
