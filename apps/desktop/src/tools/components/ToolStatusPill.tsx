import type { FC, ReactNode } from 'react';

import styles from './ToolStatusPill.module.css';

export type ToolStatus = 'ok' | 'error' | 'warn' | 'neutral';

export interface ToolStatusPillProps {
  /** One of the four LCARS semantic states. */
  status: ToolStatus;
  /** Visible label (e.g. "VALID", "PARSE ERROR"). */
  children: ReactNode;
  /** Optional detail text shown next to the pill (e.g. "line 3, col 7"). */
  detail?: ReactNode;
}

/**
 * ToolStatusPill — a compact status indicator for the tool footer.
 *
 * Four semantic states map to the picard-modern palette:
 *   - ok      → green          (LcarsTelemetryLabel's positive accent)
 *   - error   → salmon/red     (--lcars-color-red fallback)
 *   - warn    → mustard        (--lcars-color-mustard)
 *   - neutral → dusty purple   (--lcars-color-african-violet)
 *
 * Kept deliberately text-only (no icons) — we haven't picked an icon
 * system yet, and LCARS has strong opinions about iconography
 * (essentially "don't"). The label + color alone carries the signal.
 */
export const ToolStatusPill: FC<ToolStatusPillProps> = ({
  status,
  children,
  detail,
}) => {
  return (
    <span className={styles.wrap}>
      <span className={`${styles.pill} ${styles[status]}`}>{children}</span>
      {detail ? <span className={styles.detail}>{detail}</span> : null}
    </span>
  );
};
