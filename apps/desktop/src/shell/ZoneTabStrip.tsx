import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FC, MouseEvent as ReactMouseEvent } from 'react';
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

  // The scrolling area (inner element) is what we attach all scroll-related
  // logic to. The outer `.strip` is a non-scrolling flex container so the
  // scroll controls can sit pinned to the right of the strip.
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Track scroll/overflow state so the buttons can mount conditionally and
  // disable themselves at the boundaries. We update on scroll AND on resize
  // (the strip width changes when zones collapse / window resizes / tabs
  // are added or removed).
  const [scrollState, setScrollState] = useState({
    overflow: false,
    atStart: true,
    atEnd: true,
  });

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 1;
      const atStart = el.scrollLeft <= 0;
      // -1 fudge for sub-pixel rounding so the right button correctly
      // disables itself when the user has scrolled to the very end.
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      setScrollState((prev) =>
        prev.overflow === overflow && prev.atStart === atStart && prev.atEnd === atEnd
          ? prev
          : { overflow, atStart, atEnd },
      );
    };

    update();
    el.addEventListener('scroll', update, { passive: true });

    // Re-check whenever the scroll area's intrinsic size changes — covers
    // window resizes, zone collapses, and tab adds/removes (because the
    // tabs' aggregated width is observed on the same element).
    const ro = new ResizeObserver(update);
    ro.observe(el);

    // Wheel-to-horizontal-scroll. React's onWheel is passive; we need
    // addEventListener with { passive: false } to preventDefault and stop
    // the parent container from stealing the scroll.
    const handleWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', update);
      el.removeEventListener('wheel', handleWheel);
      ro.disconnect();
    };
    // Re-init when the displayed tabs change so the initial `update()` runs
    // after the new tab widths have laid out.
  }, [displayTools.length]);

  // Scroll the active tab into view when it changes (e.g. selected via
  // command palette while offscreen). Uses `nearest` so a tab that's already
  // visible doesn't trigger an unnecessary jump.
  useEffect(() => {
    if (!activeId) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    const activeEl = el.querySelector<HTMLElement>(
      `[data-tool-id="${CSS.escape(activeId)}"]`,
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeId]);

  // Click handlers for the spin-control buttons. Each press scrolls roughly
  // one pane width (~80%) so a small overflow finishes in a single click and
  // a large one paginates predictably.
  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const step = Math.max(80, el.clientWidth * 0.8);
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  // Render nothing when the zone has no docked tools. The previous
  // "ZONE · 0 TABS" empty banner ate 52px of vertical space and was
  // sitting on top of the launchpad / empty state below — the host zone
  // already conveys "nothing here" through its own empty state, the
  // strip doesn't need to redundantly announce it.
  if (displayTools.length === 0) {
    return null;
  }

  return (
    <div className={styles.strip}>
      <div
        ref={scrollAreaRef}
        className={styles.scrollArea}
        role="tablist"
        aria-orientation="horizontal"
      >
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
              onClose={() => closeTool(tool.id)}
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
      {scrollState.overflow && (
        <div className={styles.scrollControls} aria-hidden={false}>
          <button
            type="button"
            className={styles.scrollBtn}
            onClick={() => scrollByPage(-1)}
            disabled={scrollState.atStart}
            aria-label="Scroll tabs left"
            title="Scroll tabs left"
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.scrollBtn}
            onClick={() => scrollByPage(1)}
            disabled={scrollState.atEnd}
            aria-label="Scroll tabs right"
            title="Scroll tabs right"
          >
            ›
          </button>
        </div>
      )}
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
  onClose: () => void;
  trailing?: React.ReactNode;
}

/**
 * Tab pill with a transient "pulse" animation triggered whenever `pulseId`
 * changes. The pulse is purely presentational — no store mutation.
 *
 * Also acts as a drag source for pane-level drop targets: `dragstart` tags
 * `dataTransfer` with the tool id under the shell-wide TAB_MIME, which the
 * window-level listener on every `PaneDropTarget` uses to light up.
 *
 * Houses the quick close button (× to the right of the label, before the
 * action menu trigger). The button is muted by default and reveals on
 * tab-hover or when this tab is active — matches VSCode's tab affordance.
 */
const PulsingTab: FC<PulsingTabProps> = ({
  toolId,
  label,
  isActive,
  pulseId,
  activeColor,
  inactiveColor,
  onSelect,
  onClose,
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

  // Stop pointer events from reaching the LcarsPill / drag source so a
  // close-click never doubles as a tab-select or drag-start.
  const handleCloseClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClose();
  };
  const handleCloseMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };
  // Middle-click anywhere on the tab wrapper closes it — VSCode parity.
  const handleAuxClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button === 1) {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={`${styles.tabWrap} ${isActive ? styles.active : ''} ${
        pulsing ? styles.pulsing : ''
      } ${dragging ? styles.dragging : ''}`}
      role="tab"
      aria-selected={isActive}
      data-tool-id={toolId}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onAuxClick={handleAuxClick}
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
      <button
        type="button"
        className={styles.closeBtn}
        onClick={handleCloseClick}
        onMouseDown={handleCloseMouseDown}
        // The wrapping div is a drag source. Marking the button non-draggable
        // and stopping mousedown propagation keeps a click-on-close from
        // accidentally initiating a tab drag if the user wiggles the mouse.
        draggable={false}
        aria-label={`Close ${label}`}
        title={`Close ${label}`}
      >
        ×
      </button>
      {trailing}
    </div>
  );
};
