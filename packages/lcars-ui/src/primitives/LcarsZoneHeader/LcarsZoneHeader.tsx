import type { CSSProperties, FC, ReactNode } from 'react';
import styles from './LcarsZoneHeader.module.css';

export interface LcarsZoneHeaderProps {
  /** Small prefix, typically a zone id like "CTR-01". */
  eyebrow?: string;
  /** Main label (e.g. tool name). */
  title: ReactNode;
  /** Right-aligned controls (pills, chips, etc.). */
  controls?: ReactNode;
  /** Background color of the band. Defaults to --lcars-color-african-violet. */
  color?: string;
  /** Small dot status indicator next to the title. Hidden when omitted. */
  indicatorColor?: string;
  /** Drop the pill radius for zones abutting other framing. */
  square?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsZoneHeader — compact title band for Center/Right/Bottom dock zones.
 * Hosts the active tool title plus its command controls.
 */
export const LcarsZoneHeader: FC<LcarsZoneHeaderProps> = ({
  eyebrow,
  title,
  controls,
  color,
  indicatorColor,
  square = false,
  className = '',
  style = {},
}) => {
  const headerStyle: CSSProperties = {
    ...style,
    ...(color ? ({ '--zone-header-bg': color } as CSSProperties) : {}),
    ...(indicatorColor ? ({ '--zone-indicator-color': indicatorColor } as CSSProperties) : {}),
  };

  const classNames = [
    styles.header,
    square && styles.square,
    indicatorColor && styles.hasIndicator,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={classNames} style={headerStyle}>
      <div className={styles.titleGroup}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <span className={styles.title}>{title}</span>
      </div>
      {controls && <div className={styles.controls}>{controls}</div>}
    </header>
  );
};
