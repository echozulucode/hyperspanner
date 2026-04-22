import type { FC, ReactNode } from 'react';
import styles from './LcarsWireframeInset.module.css';

export interface LcarsWireframeInsetProps {
  title: string;
  code?: string;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * LcarsWireframeInset — frame with clipped corners and corner brackets for display content.
 * Designed for tactical readouts, graphs, and wireframe visualizations.
 */
export const LcarsWireframeInset: FC<LcarsWireframeInsetProps> = ({
  title,
  code,
  footerLeft,
  footerRight,
  children,
  className = '',
}) => {
  return (
    <aside className={`${styles.frame} ${className}`.trim()}>
      <header className={styles.header}>
        <span>{title}</span>
        {code && <span className={styles.code}>{code}</span>}
      </header>
      <div className={styles.body}>{children}</div>
      {(footerLeft || footerRight) && (
        <footer className={styles.footer}>
          <span>{footerLeft}</span>
          <span>{footerRight}</span>
        </footer>
      )}
    </aside>
  );
};
