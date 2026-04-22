import type { CSSProperties, FC } from 'react';
import styles from './LcarsTabCluster.module.css';

export interface LcarsTabPillProps {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * LcarsTabPill — pill-shaped tab button with color stripe in active state.
 */
export const LcarsTabPill: FC<LcarsTabPillProps> = ({
  label,
  color,
  active,
  onClick,
  className = '',
  'aria-label': ariaLabel,
}) => {
  // --tab-pill-color preserves the original color so the active state
  // can still show it as a left-edge stripe even after we swap the
  // background to the almond-creme highlight.
  const style = {
    backgroundColor: color,
    '--tab-pill-color': color,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`${styles.pill} ${active ? styles.pillActive : ''} ${className}`.trim()}
      style={style}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {label}
    </button>
  );
};
