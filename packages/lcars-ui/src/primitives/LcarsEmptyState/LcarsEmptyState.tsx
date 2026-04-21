import type { CSSProperties, FC, ReactNode } from 'react';
import styles from './LcarsEmptyState.module.css';

export interface LcarsEmptyStateProps {
  /** Optional tiny eyebrow label ("CHANNEL 0000" style). */
  eyebrow?: string;
  /** Main heading. */
  title: ReactNode;
  /** Optional descriptive paragraph. */
  description?: ReactNode;
  /** Slot for an icon or decorative element. */
  icon?: ReactNode;
  /** Slot for an action pill or other CTA. */
  action?: ReactNode;
  /** Compact variant for inline empty states. */
  compact?: boolean;
  /** Color behind the icon (accent ring). */
  iconBackground?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsEmptyState — standardized empty view. Use whenever a tool opens
 * with no selection yet, or a list has no items.
 */
export const LcarsEmptyState: FC<LcarsEmptyStateProps> = ({
  eyebrow,
  title,
  description,
  icon,
  action,
  compact = false,
  iconBackground,
  className = '',
  style = {},
}) => {
  const emptyStyle: CSSProperties = {
    ...style,
    ...(iconBackground ? ({ '--empty-icon-bg': iconBackground } as CSSProperties) : {}),
  };

  const classNames = [styles.empty, compact && styles.compact, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} style={emptyStyle} role="status" aria-live="polite">
      {icon && <div className={styles.icon}>{icon}</div>}
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
