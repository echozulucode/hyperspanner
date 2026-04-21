import type { CSSProperties, FC, ReactNode } from 'react';
import styles from './LcarsTelemetryLabel.module.css';

export type TelemetrySize = 'small' | 'medium' | 'large';

export interface LcarsTelemetryLabelProps {
  /** Uppercase name (e.g. "RAM"). */
  name: ReactNode;
  /** Value (e.g. "42"). */
  value: ReactNode;
  /** Optional unit appended to value (e.g. "%"). */
  unit?: string;
  /** Small status dot shown on the left. */
  indicatorColor?: string;
  /** Color overrides. */
  color?: string;
  background?: string;
  size?: TelemetrySize;
  /** Show a solid background chip instead of inline label. */
  filled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsTelemetryLabel — compact metric pill for status strips.
 * Use to surface live telemetry (RAM, CPU, tool counts) in the bottom bar.
 */
export const LcarsTelemetryLabel: FC<LcarsTelemetryLabelProps> = ({
  name,
  value,
  unit,
  indicatorColor,
  color,
  background,
  size = 'medium',
  filled = false,
  className = '',
  style = {},
}) => {
  const labelStyle: CSSProperties = {
    ...style,
    ...(color ? ({ '--telem-color': color } as CSSProperties) : {}),
    ...(background ? ({ '--telem-bg': background } as CSSProperties) : {}),
    ...(indicatorColor ? ({ '--telem-dot': indicatorColor } as CSSProperties) : {}),
  };

  const classNames = [styles.label, styles[size], filled && styles.withBg, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} style={labelStyle} role="status">
      {indicatorColor && <span className={styles.dot} aria-hidden="true" />}
      <span className={styles.name}>{name}</span>
      <span className={styles.value}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
    </span>
  );
};
