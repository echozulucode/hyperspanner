import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FC } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';
import { useTheme } from '../contexts/ThemeContext';
import type { OpenTool, Zone } from '../state';
import { useWorkspaceStore } from '../state';
import { getTool } from '../tools';
import { TabActionMenu } from './TabActionMenu';
import { TAB_MIME } from './PaneDropTarget';
import styles from './ZoneTabStrip.module.css';

export interface ZoneTabStripProps {
  zone: Zone;
  tools: OpenTool[];
  activeId: string | null;
  /** Optional filter — center split uses this to render side A or B only. */
  filterSide?: 'a' | 'b';
}

/**
 * ZoneTabStrip — renders a row of LCARS pill-tabs for the open tools in a zone.
 *
 * Reads the workspace store directly for actions (moveTool, splitCenter, etc.)
 * to avoid prop-drilling every action down from AppShell.
 *
 * Pulses the active tab when `pulseId` changes (single-instance focus signal
 * from `openTool` / `focusTool`).
 */
export const ZoneTabStrip: FC<ZoneTabStripProps> = ({
  zone,
  tools,
  activeId,
  filterSide,
}) => {
  const { theme } = useTheme();

  const setActive = useWorkspaceStore((s) => s.setActive);
  const closeTool = useWorkspaceStore((s) => s.closeTool);
  const focusTool = useWorkspaceStore((s) => s.focusTool);
  const moveTool = useWorkspaceStore((s) => s.moveTool);
  const splitCenter = useWorkspaceStore((s) => s.splitCenter);
  const mergeCenter = useWorkspaceStore((s) => s.mergeCenter);
  const resetLayout = useWorkspaceStore((s) => s.resetLayout);
  const centerSplit = useWorkspaceStore((s) => s.centerSplit);

  const displayTools = filterSide
    ? tools.filter((t) => t.splitSide === filterSide)
    : tools;

  if (displayTools.length === 0) {
    return (
      <div className={styles.strip} role="tablist" aria-orientation="horizontal">
        <span className={styles.empty}>
          {zone.toUpperCase()} · 0 TABS
        </span>
      </div>
    );
  }

  return (
    <div className={styles.strip} role="tablist" aria-orientation="horizontal">
      {displayTools.map((tool) => {
        const descriptor = getTool(tool.id);
        const label = descriptor?.name ?? tool.id;
        const isActive = tool.id === activeId;
        return (
          <PulsingTab
            key={tool.id}
            toolId={tool.id}
            label={label}
            isActive={isActive}
            pulseId={tool.pulseId}
            onSelect={() => setActive(zone, tool.id)}
            activeColor={theme.colors.orange}
            inactiveColor={theme.colors.africanViolet}
            trailing={
              <TabActionMenu
                toolId={tool.id}
                currentZone={tool.zone}
                centerSplit={centerSplit}
                onFocus={focusTool}
                onMove={(id, z) => moveTool(id, z)}
                onSplit={(dir) => splitCenter(dir)}
                onMerge={() => mergeCenter()}
                onMaximize={(id) => {
                  // Phase 3 maximize = collapse Right+Bottom and focus the tool.
                  useWorkspaceStore.getState().setZoneCollapsed('right', true);
                  useWorkspaceStore.getState().setZoneCollapsed('bottom', true);
                  focusTool(id);
                }}
                onResetLayout={resetLayout}
                onClose={closeTool}
              />
            }
          />
        );
      })}
    </div>
  );
};

interface PulsingTabProps {
  toolId: string;
  label: string;
  isActive: boolean;
  pulseId: number | undefined;
  activeColor: string;
  inactiveColor: string;
  onSelect: () => void;
  trailing?: React.ReactNode;
}

/**
 * Tab pill with a transient "pulse" animation triggered whenever `pulseId`
 * changes. The pulse is purely presentational — no store mutation.
 *
 * Also acts as a drag source for pane-level drop targets: `dragstart` tags
 * `dataTransfer` with the tool id under the shell-wide TAB_MIME, which the
 * window-level listener on every `PaneDropTarget` uses to light up.
 */
const PulsingTab: FC<PulsingTabProps> = ({
  toolId,
  label,
  isActive,
  pulseId,
  activeColor,
  inactiveColor,
  onSelect,
  trailing,
}) => {
  const [pulsing, setPulsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const lastPulse = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (pulseId === undefined) return;
    if (lastPulse.current === pulseId) return;
    lastPulse.current = pulseId;
    setPulsing(true);
    const t = window.setTimeout(() => setPulsing(false), 520);
    return () => window.clearTimeout(t);
  }, [pulseId]);

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(TAB_MIME, toolId);
    // Second payload under a decorated MIME that embeds the tool id in
    // the TYPE. Browsers only expose the STRING VALUE of `dataTransfer`
    // on drop (during dragstart/dragenter the value reads as empty), but
    // the type LIST is visible throughout the drag. PaneDropTarget reads
    // the id out of the type during dragstart to decide whether to show
    // itself (supportedZones gating). Without this decoration, drop
    // targets that refuse this tool's zone would still flash visible
    // and only silently swallow the drop — confusing UX.
    event.dataTransfer.setData(`${TAB_MIME};id=${toolId}`, toolId);
    // Text fallback so dropping on non-targets shows something sensible.
    event.dataTransfer.setData('text/plain', label);
    event.dataTransfer.effectAllowed = 'move';
    setDragging(true);
  };

  const handleDragEnd = () => {
    setDragging(false);
  };

  return (
    <div
      className={`${styles.tabWrap} ${pulsing ? styles.pulsing : ''} ${
        dragging ? styles.dragging : ''
      }`}
      role="tab"
      aria-selected={isActive}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <LcarsPill
        size="small"
        rounded="both"
        color={isActive ? activeColor : inactiveColor}
        active={isActive}
        onClick={onSelect}
        aria-label={label}
      >
        <span className={styles.label}>{label}</span>
      </LcarsPill>
      {trailing}
    </div>
  );
};
