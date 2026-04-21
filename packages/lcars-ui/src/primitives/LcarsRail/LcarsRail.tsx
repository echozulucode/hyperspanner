import type { CSSProperties, FC, ReactNode } from 'react';
import styles from './LcarsRail.module.css';

export type RailWidth = 'narrow' | 'default' | 'wide';

export interface LcarsRailProps {
  children?: ReactNode;
  width?: RailWidth;
  /**
   * When true, render a colored cap with a top-right elbow curve above children.
   * The default shell layout uses this to hand off into the top bar.
   */
  topCap?: boolean;
  /** Same, but bottom-cap flipped. */
  bottomCap?: boolean;
  /** Cap color (both caps share it). Defaults to --lcars-color-orange. */
  capColor?: string;
  /** Rail column background (behind children). Transparent by default. */
  background?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

/**
 * LcarsRail — vertical frame column for the shell's left side.
 * Hosts stacked LcarsPanel children. Optionally renders elbow caps
 * at top/bottom to blend into the horizontal framing bars.
 */
export const LcarsRail: FC<LcarsRailProps> = ({
  children,
  width = 'default',
  topCap = false,
  bottomCap = false,
  capColor,
  background,
  className = '',
  style = {},
  'aria-label': ariaLabel,
}) => {
  const widthClass =
    width === 'narrow' ? styles.narrow : width === 'wide' ? styles.wide : '';

  const railStyle: CSSProperties = {
    ...style,
    ...(capColor ? ({ '--rail-cap-color': capColor } as CSSProperties) : {}),
    ...(background ? ({ '--rail-bg': background } as CSSProperties) : {}),
  };

  const classNames = [styles.rail, widthClass, className].filter(Boolean).join(' ');

  return (
    <aside className={classNames} style={railStyle} aria-label={ariaLabel}>
      {topCap && <div className={`${styles.railCap} ${styles.capTop}`} />}
      <div className={styles.body}>{children}</div>
      {bottomCap && <div className={`${styles.railCap} ${styles.capBottom}`} />}
    </aside>
  );
};
