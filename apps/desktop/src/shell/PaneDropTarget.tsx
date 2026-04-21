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
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [hover, setHover] = useState<DropRegion | null>(null);
  // Ref to avoid listener races when dragend fires after the component
  // unmounts (e.g. during a layout transition).
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const onDragStart = (event: globalThis.DragEvent) => {
      if (!aliveRef.current) return;
      const types = event.dataTransfer?.types;
      if (!types) return;
      // DOMStringList in some browsers — normalize with contains/includes.
      const hasMime =
        typeof (types as DOMStringList).contains === 'function'
          ? (types as DOMStringList).contains(TAB_MIME)
          : Array.from(types as unknown as Iterable<string>).includes(TAB_MIME);
      if (hasMime) setDragActive(true);
    };
    const onDragEndOrDrop = () => {
      if (!aliveRef.current) return;
      setDragActive(false);
      setHover(null);
    };
    window.addEventListener('dragstart', onDragStart);
    window.addEventListener('dragend', onDragEndOrDrop);
    window.addEventListener('drop', onDragEndOrDrop);
    return () => {
      aliveRef.current = false;
      window.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('dragend', onDragEndOrDrop);
      window.removeEventListener('drop', onDragEndOrDrop);
    };
  }, []);

  if (!dragActive) return null;

  const allowedRegions: DropRegion[] =
    variant === 'center-single'
      ? ['top', 'right', 'bottom', 'left', 'center']
      : ['center'];

  const handleDragOver = (region: DropRegion) => (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (hover !== region) setHover(region);
  };

  const handleDragLeave = (region: DropRegion) => () => {
    if (hover === region) setHover(null);
  };

  const handleDrop = (region: DropRegion) => (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
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
