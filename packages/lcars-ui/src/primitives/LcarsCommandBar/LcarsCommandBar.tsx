import type { CSSProperties, FC, ReactNode } from 'react';
import styles from './LcarsCommandBar.module.css';

export type CommandBarAlign = 'start' | 'end' | 'space-between';

export interface LcarsCommandBarProps {
  children?: ReactNode;
  /** Optional uppercase label shown before the controls (e.g. "ACTIONS"). */
  label?: string;
  /** Horizontal alignment of the control cluster. */
  align?: CommandBarAlign;
  /** Background color of the bar. Transparent by default. */
  background?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

/**
 * LcarsCommandBar — thin horizontal row of controls (typically LcarsPill).
 * Place at the top or bottom of a tool pane for primary commands.
 *
 * Renders children inline; use nested `<LcarsCommandBar.Divider />` or
 * `<LcarsCommandBar.Group>` for structure.
 */
interface CommandBarSubcomponents {
  Divider: FC;
  Group: FC<{ children?: ReactNode }>;
}

const LcarsCommandBarBase: FC<LcarsCommandBarProps> = ({
  children,
  label,
  align = 'start',
  background,
  className = '',
  style = {},
  'aria-label': ariaLabel,
}) => {
  const barStyle: CSSProperties = {
    ...style,
    ...(background ? ({ '--command-bar-bg': background } as CSSProperties) : {}),
  };

  const alignClass =
    align === 'space-between'
      ? styles['space-between']
      : align === 'end'
        ? styles.end
        : styles.start;

  const classNames = [styles.bar, alignClass, className].filter(Boolean).join(' ');

  return (
    <div className={classNames} style={barStyle} role="toolbar" aria-label={ariaLabel}>
      {label && <span className={styles.label}>{label}</span>}
      {children}
    </div>
  );
};

const Divider: FC = () => <span className={styles.divider} aria-hidden="true" />;

const Group: FC<{ children?: ReactNode }> = ({ children }) => (
  <div className={styles.group}>{children}</div>
);

export const LcarsCommandBar = LcarsCommandBarBase as FC<LcarsCommandBarProps> &
  CommandBarSubcomponents;
LcarsCommandBar.Divider = Divider;
LcarsCommandBar.Group = Group;
