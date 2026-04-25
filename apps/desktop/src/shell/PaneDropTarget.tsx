import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FC } from 'react';
import styles from './PaneDropTarget.module.css';

/** MIME type used on `dataTransfer` for tab drags. Anything that matches
 *  this on the window-level `dragstart` turns every drop target visible. */
export const TAB_MIME = 'application/x-hyperspanner-tool';

/** Drop regions on a pane. `center` = move only; the edges = split in that
 *  direction (horizontal split if top/bottom, vertical split if left/right). */
export type DropRegion = 'center' | 'top' | 'right' | 'bottom' | 'left';

export type PaneDropVariant =
  /** Single-pane center — full 5-region set (split + move). */
  | 'center-single'
  /** One side of an existing split — move only (can't re-split a side in Phase 3). */
  | 'center-side'
  /** Right or bottom zone — move only. */
  | 'zone-only';

export interface PaneDropTargetProps {
  variant: PaneDropVariant;
  /** Fired with the matched region after a successful drop. */
  onDrop: (region: DropRegion, toolId: string) => void;
  /** Optional label shown on the center hit region (e.g. "INSPECTOR"). */
  label?: string;
  /**
   * Optional predicate consulted when a drag starts. If provided and it
   * returns false for the incoming tool id, this drop target stays
   * invisible for the duration of the drag — used by the inspector/
   * console zones to refuse large tools whose `supportedZones` don't
   * include that zone. Defensive default: if omitted, all tools are
   * accepted (legacy behavior).
   */
  canAccept?: (toolId: string) => boolean;
}

/**
 * PaneDropTarget — absolutely-positioned overlay rendered inside a
 * `position: relative` pane. Listens to window-level `dragstart` / `dragend`
 * for our tab MIME; while a tab drag is in progress, paints the allowed
 * hit regions for this pane and highlights the one under the pointer.
 *
 * Pointer events are off on the root and on only for the hit regions, so
 * the underlying tool body keeps receiving pointer events when nothing
 * is being dragged.
 */
export const PaneDropTarget: FC<PaneDropTargetProps> = ({
  variant,
  onDrop,
  label,
  canAccept,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [hover, setHover] = useState<DropRegion | null>(null);
  // Ref to avoid listener races when dragend fires after the component
  // unmounts (e.g. during a layout transition).
  const aliveRef = useRef(true);
  // Latest canAccept — stashed in a ref so the dragstart listener picks
  // up the current predicate without re-registering on every render. The
  // predicate is recreated each render in most consumers; without a ref,
  // useEffect's [] deps would close over a stale copy.
  const canAcceptRef = useRef(canAccept);
  canAcceptRef.current = canAccept;

  useEffect(() => {
    aliveRef.current = true;
    const onDragStart = (event: globalThis.DragEvent) => {
      if (!aliveRef.current) return;
      const types = event.dataTransfer?.types;
      if (!types) return;
      // `types` is typed as `readonly string[]` in modern TS lib.dom, but
      // historically browsers exposed a DOMStringList. Normalize by
      // feature-testing for `contains` (DOMStringList) and falling back to
      // `includes` (modern array-like). A runtime cast to `unknown` keeps
      // this cross-compatible without a structural DOMStringList cast,
      // which TS 5.9 rejects because `readonly string[]` lacks `item`.
      const typesAny = types as unknown as { contains?: (s: string) => boolean };
      const hasMime =
        typeof typesAny.contains === 'function'
          ? typesAny.contains(TAB_MIME)
          : Array.from(types as unknown as Iterable<string>).includes(TAB_MIME);
      if (!hasMime) return;
      // dataTransfer.getData() is NOT available during dragstart in most
      // browsers — the payload is only readable on drop. We gate the
      // overlay on whether the drag could POSSIBLY be accepted here by
      // reading a custom MIME that carries the tool id in its type
      // suffix: `application/x-hyperspanner-tool;id=<toolId>`. If no
      // canAccept predicate is installed, everything passes. See the
      // ZoneTabStrip dragstart payload for the emitter side.
      const predicate = canAcceptRef.current;
      if (predicate) {
        const typeList = Array.from(types as unknown as Iterable<string>);
        // Look for `application/x-hyperspanner-tool;id=<id>` — the id
        // after `id=` is the tool id. If absent, fall back to showing
        // the target (defensive: older drag sources may not supply it).
        const idCarrier = typeList.find((t) =>
          t.startsWith(`${TAB_MIME};id=`),
        );
        if (idCarrier) {
          const toolId = idCarrier.slice(`${TAB_MIME};id=`.length);
          if (!predicate(toolId)) return;
        }
      }
      setDragActive(true);
    };
    const onDragEndOrDrop = () => {
      if (!aliveRef.current) return;
      setDragActive(false);
      setHover(null);
    };
    /*
     * Watchdog: `dragend` is supposed to fire after every drag operation,
     * but it's dispatched on the original drag source. When that source
     * unmounts before `dragend` reaches the window — which is exactly
     * what happens when a tool's tab is moved out of its zone (the
     * source `PulsingTab` is gone before the dispatcher gets there) —
     * the event never reaches our window-level handler and `dragActive`
     * gets stuck `true`, leaving the drop overlay visible. `mouseup`
     * fires reliably after every pointer release (HTML5 drag suppresses
     * mouse events during the drag, so this listener only sees the
     * final release), making it a safe last-resort cleanup.
     */
    window.addEventListener('dragstart', onDragStart);
    window.addEventListener('dragend', onDragEndOrDrop);
    window.addEventListener('drop', onDragEndOrDrop);
    window.addEventListener('mouseup', onDragEndOrDrop);
    return () => {
      aliveRef.current = false;
      window.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('dragend', onDragEndOrDrop);
      window.removeEventListener('drop', onDragEndOrDrop);
      window.removeEventListener('mouseup', onDragEndOrDrop);
    };
  }, []);

  if (!dragActive) return null;

  const allowedRegions: DropRegion[] =
    variant === 'center-single'
      ? ['top', 'right', 'bottom', 'left', 'center']
      : ['center'];

  const handleDragOver = (region: DropRegion) => (event: DragEvent) => {
    // `preventDefault` is required to mark this element as a valid drop
    // target (otherwise the browser disallows the drop). We deliberately
    // do NOT call `stopPropagation` — React's `stopPropagation` calls
    // through to the native event, which would prevent the bubble from
    // reaching our window-level cleanup listeners.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (hover !== region) setHover(region);
  };

  const handleDragLeave = (region: DropRegion) => () => {
    if (hover === region) setHover(null);
  };

  const handleDrop = (region: DropRegion) => (event: DragEvent) => {
    event.preventDefault();
    // No `stopPropagation` here — see comment in `handleDragOver`. The
    // window-level `drop` listener installed in the `useEffect` above
    // is how every *other* `PaneDropTarget` learns the drag has ended,
    // and stopping propagation here was the actual cause of the
    // "drop overlay sometimes stays visible" bug we previously chased
    // through `dragend` / `mouseup` watchdogs.
    const toolId = event.dataTransfer?.getData(TAB_MIME);
    setDragActive(false);
    setHover(null);
    if (toolId) onDrop(region, toolId);
  };

  const regionClass = (region: DropRegion) =>
    [styles[`region_${region}`], hover === region ? styles.active : '']
      .filter(Boolean)
      .join(' ');

  return (
    <div className={styles.overlay} aria-hidden="true">
      {allowedRegions.map((region) => (
        <div
          key={region}
          className={regionClass(region)}
          onDragEnter={handleDragOver(region)}
          onDragOver={handleDragOver(region)}
          onDragLeave={handleDragLeave(region)}
          onDrop={handleDrop(region)}
        >
          {hover === region && (
            <span className={styles.regionLabel}>
              {region === 'center'
                ? `MOVE${label ? ` → ${label}` : ''}`
                : `SPLIT ${region.toUpperCase()}`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
