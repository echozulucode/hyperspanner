import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FC, KeyboardEvent, PointerEvent } from 'react';
import styles from './LcarsSplitHandle.module.css';

export type SplitOrientation = 'vertical' | 'horizontal';

export interface LcarsSplitHandleProps {
  /**
   * `vertical` handles separate left/right panes and resize horizontally.
   * `horizontal` handles separate top/bottom panes and resize vertically.
   */
  orientation?: SplitOrientation;
  /** Current value (px) — used for ARIA. */
  value?: number;
  /** Absolute bounds for keyboard clamping and ARIA. */
  min?: number;
  max?: number;
  /** Pixels moved per arrow-key press. */
  step?: number;
  /** Called with pointer-delta during drag. */
  onDrag?: (deltaPx: number) => void;
  /** Called with the new target value on keyboard resize. */
  onKeyboardResize?: (nextValue: number) => void;
  /** Called when a drag begins. */
  onDragStart?: () => void;
  /** Called when a drag ends. */
  onDragEnd?: () => void;
  'aria-label'?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsSplitHandle — the thin black seam between two panes. Drag to resize.
 * Host is responsible for applying the resulting sizes; this is a pure
 * input surface that emits deltas.
 */
export const LcarsSplitHandle: FC<LcarsSplitHandleProps> = ({
  orientation = 'vertical',
  value,
  min,
  max,
  step = 8,
  onDrag,
  onKeyboardResize,
  onDragStart,
  onDragEnd,
  'aria-label': ariaLabel,
  className = '',
  style = {},
}) => {
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef<number | null>(null);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      lastPos.current = orientation === 'vertical' ? event.clientX : event.clientY;
      setDragging(true);
      onDragStart?.();
    },
    [orientation, onDragStart],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (lastPos.current == null) return;
      const current = orientation === 'vertical' ? event.clientX : event.clientY;
      const delta = current - lastPos.current;
      lastPos.current = current;
      if (delta !== 0) onDrag?.(delta);
    },
    [orientation, onDrag],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      lastPos.current = null;
      setDragging(false);
      onDragEnd?.();
    },
    [onDragEnd],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (value == null || !onKeyboardResize) return;
      let next = value;
      const negKey = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp';
      const posKey = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown';
      if (event.key === negKey) next -= step;
      else if (event.key === posKey) next += step;
      else if (event.key === 'Home' && min != null) next = min;
      else if (event.key === 'End' && max != null) next = max;
      else return;
      if (min != null) next = Math.max(min, next);
      if (max != null) next = Math.min(max, next);
      event.preventDefault();
      onKeyboardResize(next);
    },
    [value, onKeyboardResize, orientation, step, min, max],
  );

  // Reset cursor when component unmounts mid-drag.
  useEffect(() => () => setDragging(false), []);

  const classNames = [
    styles.handle,
    styles[orientation],
    dragging && styles.active,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={ariaLabel ?? `Resize ${orientation} split`}
      tabIndex={0}
      className={classNames}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.grip} />
    </div>
  );
};
