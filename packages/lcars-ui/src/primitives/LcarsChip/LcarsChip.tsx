import type { CSSProperties, FC, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import styles from './LcarsChip.module.css';
import { lcarsColor, type LcarsSemanticRole } from '../../tokens';

export type ChipSize = 'small' | 'medium';

export interface LcarsChipProps {
  children: ReactNode;
  /** Semantic role drives default color. Override with `color` prop. */
  variant?: LcarsSemanticRole;
  size?: ChipSize;
  /** Explicit background color (overrides variant). */
  color?: string;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  style?: CSSProperties;
}

const variantColor: Record<LcarsSemanticRole, string> = {
  primary: lcarsColor.orange,
  secondary: lcarsColor.africanViolet,
  accent: lcarsColor.butterscotch,
  info: lcarsColor.bluey,
  success: lcarsColor.green,
  warning: lcarsColor.butterscotch,
  error: lcarsColor.red,
  critical: lcarsColor.mars,
  neutral: lcarsColor.gray,
};

/**
 * LcarsChip — small rounded pill for tags, filter selectors, and status.
 * Use `variant` to pick semantic color, or pass `color` to override.
 */
export const LcarsChip: FC<LcarsChipProps> = ({
  children,
  variant = 'info',
  size = 'medium',
  color,
  interactive = false,
  selected = false,
  onClick,
  onRemove,
  className = '',
  style = {},
}) => {
  const effectiveColor = color ?? variantColor[variant];

  const handleClick = () => {
    if (interactive) {
      onClick?.();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove?.();
  };

  const classNames = [
    styles.chip,
    styles[size],
    interactive && styles.interactive,
    selected && styles.selected,
    variant === 'critical' && styles.critical,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const chipStyle: CSSProperties = {
    ...style,
    ['--chip-color' as string]: effectiveColor,
  };

  return (
    <div
      className={classNames}
      style={chipStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
    >
      <span className={styles.content}>{children}</span>
      {onRemove && (
        <button
          className={styles.removeButton}
          onClick={handleRemove}
          aria-label="Remove"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  );
};
