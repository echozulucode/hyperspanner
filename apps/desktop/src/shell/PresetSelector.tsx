import { useCallback } from 'react';
import type { ChangeEvent, FC } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { LAYOUT_PRESETS, useWorkspaceStore } from '../state';
import styles from './PresetSelector.module.css';

export interface PresetSelectorProps {
  /** Optional className override — lets the AppShell pass `styles.something`
   *  to embed the selector cleanly into the navigation pill cluster. */
  className?: string;
}

/**
 * PresetSelector — a styled `<select>` for jumping between layout presets.
 *
 * Lives in the AppShell's top-row pill cluster, between the theme pill and
 * the RESET pill. Reads `layoutPreset` from the workspace store; on change
 * dispatches `applyPreset(id)`.
 *
 * Design choices:
 * - Native `<select>` rather than a custom popover. Six items doesn't
 *   warrant the popover machinery, the keyboard / accessibility story
 *   is free, and Case Transform's mode picker already established the
 *   pattern.
 * - Sized to match the LcarsPill `size="small"` height (40px) and the
 *   top-rail's nav-pill rhythm. Border + background pull from the same
 *   LCARS CSS variables the pills consume so a theme swap re-skins it.
 * - Names sourced from `LAYOUT_PRESETS` (six built-ins: default, text-ops,
 *   validation, binary-inspection, minimal-focus, diagnostics). When
 *   custom presets land in 7.4 they'll be appended below the built-ins
 *   with a `<optgroup>` boundary.
 */
export const PresetSelector: FC<PresetSelectorProps> = ({ className }) => {
  const { layoutPreset, applyPreset } = useWorkspaceStore(
    useShallow((s) => ({
      layoutPreset: s.layoutPreset,
      applyPreset: s.applyPreset,
    })),
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      applyPreset(e.target.value);
    },
    [applyPreset],
  );

  const builtIns = Object.values(LAYOUT_PRESETS);

  return (
    <select
      className={[styles.select, className].filter(Boolean).join(' ')}
      value={layoutPreset}
      onChange={handleChange}
      aria-label="Layout preset"
      title="Switch layout preset"
    >
      {builtIns.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.name}
        </option>
      ))}
    </select>
  );
};
