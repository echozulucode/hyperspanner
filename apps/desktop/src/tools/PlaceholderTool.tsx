import type { FC } from 'react';
import { LcarsChip, LcarsTelemetryLabel } from '@hyperspanner/lcars-ui';
import { useTool } from '../state/useTool';
import { getTool } from './registry';
import styles from './PlaceholderTool.module.css';

export interface PlaceholderToolProps {
  toolId: string;
}

interface PlaceholderState {
  counter: number;
  lastEdited: number;
}

/**
 * PlaceholderTool — a generic tool body used by every registry entry in Phase 3.
 *
 * Its only job is to prove the store wiring:
 *   - reads metadata from the registry
 *   - reads/writes per-tool runtime state via `useTool` (counter + lastEdited)
 *   - persists across tab switches (try: open two tools, bump counter,
 *     switch tabs, come back — the counter should still be there)
 *
 * Phase 6 replaces instances of this component with the real tool UIs.
 */
export const PlaceholderTool: FC<PlaceholderToolProps> = ({ toolId }) => {
  const descriptor = getTool(toolId);
  const { state, setState, reset } = useTool<PlaceholderState>(toolId, {
    counter: 0,
    lastEdited: 0,
  });

  const increment = () => {
    setState((prev) => ({ counter: prev.counter + 1, lastEdited: Date.now() }));
  };

  return (
    <div className={styles.body}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>TOOL · {toolId.toUpperCase()}</div>
          <h2 className={styles.title}>{descriptor?.name ?? toolId}</h2>
          <p className={styles.description}>
            {descriptor?.description ?? 'No description available.'}
          </p>
        </div>
        <LcarsChip variant="info">PLACEHOLDER</LcarsChip>
      </header>

      <div className={styles.telemetry}>
        <LcarsTelemetryLabel
          name="Counter"
          value={String(state.counter)}
          size="medium"
        />
        <LcarsTelemetryLabel
          name="Last Edited"
          value={state.lastEdited ? new Date(state.lastEdited).toLocaleTimeString() : '—'}
          size="medium"
        />
        <LcarsTelemetryLabel
          name="Default Zone"
          value={(descriptor?.defaultZone ?? 'center').toUpperCase()}
          size="medium"
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={increment}>
          + BUMP COUNTER
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.actionSecondary}`}
          onClick={reset}
        >
          RESET STATE
        </button>
      </div>

      <p className={styles.note}>
        Phase 3 milestone — store wiring proven. Real tool bodies ship in Phase 6.
      </p>
    </div>
  );
};
