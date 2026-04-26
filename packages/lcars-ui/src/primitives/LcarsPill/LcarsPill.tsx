import type { CSSProperties, FC, MouseEvent, ReactNode } from 'react';
import styles from './LcarsPill.module.css';

export type PillRounded = 'left' | 'right' | 'both' | 'none';
export type PillSize = 'small' | 'medium' | 'large';
export type PillVariant = 'default' | 'navigation';

export interface LcarsPillProps {
  children: ReactNode;
  color?: string;
  rounded?: PillRounded;
  size?: PillSize;
  variant?: PillVariant;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  /** Native HTML `title` attribute → browser tooltip on hover. Useful
   *  for surfacing a longer hint without changing the accessible name
   *  (which keeps `getByRole({ name })` queries pinned to visible text). */
  title?: string;
}

/**
 * LcarsPill — pill-shaped button or link.
 * Label anchors to the lower-right, matching LCARS layout grammar.
 */
export const LcarsPill: FC<LcarsPillProps> = ({
  children,
  color,
  rounded = 'both',
  size = 'medium',
  variant = 'default',
  onClick,
  href,
  disabled = false,
  active = false,
  className = '',
  style = {},
  'aria-label': ariaLabel,
  title,
}) => {
  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.();
  };

  const classNames = [
    styles.pill,
    styles[
      `rounded${rounded.charAt(0).toUpperCase()}${rounded.slice(1)}` as keyof typeof styles
    ],
    styles[size],
    variant === 'navigation' && styles.navigation,
    active && styles.active,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const pillStyle: CSSProperties = {
    ...style,
    ...(color ? ({ '--pill-color': color } as CSSProperties) : {}),
  };

  if (href && !disabled) {
    return (
      <a
        href={href}
        className={classNames}
        style={pillStyle}
        onClick={handleClick}
        aria-label={ariaLabel}
        title={title}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classNames}
      style={pillStyle}
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={active || undefined}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
};
