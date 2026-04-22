import type { FC, ReactNode } from 'react';
import styles from './LcarsEventLog.module.css';

export interface LcarsEventLogItem {
  code: string;
  text: ReactNode;
  severity?: 'normal' | 'alert' | 'critical';
}

export interface LcarsEventLogProps {
  heading?: string;
  items: LcarsEventLogItem[];
  className?: string;
}

/**
 * LcarsEventLog — displays a list of timestamped events with optional severity coloring.
 */
export const LcarsEventLog: FC<LcarsEventLogProps> = ({
  heading = 'EVENT LOG',
  items,
  className = '',
}) => {
  return (
    <section className={`${styles.eventLog} ${className}`.trim()}>
      <h2 className={styles.eventLogHeading}>{heading}</h2>
      <ol className={styles.eventLogList}>
        {items.map((item, idx) => (
          <li key={idx}>
            <span className={`${styles.eventLogCode} ${styles[`severity${item.severity ? capitalize(item.severity) : 'Normal'}`]}`}>
              {item.code}
            </span>
            {item.text}
          </li>
        ))}
      </ol>
    </section>
  );
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
