import type { FC, PropsWithChildren } from 'react';
import styles from './LcarsTabCluster.module.css';

export interface LcarsTabClusterProps extends PropsWithChildren {
  className?: string;
}

/**
 * LcarsTabCluster — flex container for tab pills.
 * Lays out children with flex gap and wrapping.
 */
export const LcarsTabCluster: FC<LcarsTabClusterProps> = ({ children, className = '' }) => {
  return (
    <div className={`${styles.cluster} ${className}`.trim()}>
      {children}
    </div>
  );
};
