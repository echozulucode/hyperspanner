import type { CSSProperties, FC } from 'react';
import styles from './LcarsBar.module.css';

export interface LcarsBarSegment {
  width?: string | number;
  widthPercent?: number;
  color: string;
  flex?: boolean;
  halfHeight?: boolean;
  className?: string;
}

export interface LcarsBarProps {
  segments: LcarsBarSegment[];
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsBar — horizontal decorative bar composed of colored segments.
 * The shell's top and bottom framing bars are built from this.
 */
export const LcarsBar: FC<LcarsBarProps> = ({ segments, className = '', style = {} }) => {
  return (
    <div className={`${styles.barPanel} ${className}`} style={style}>
      {segments.map((segment, index) => {
        const segmentStyle: CSSProperties = { backgroundColor: segment.color };

        if (segment.width != null) {
          segmentStyle.width =
            typeof segment.width === 'number' ? `${segment.width}px` : segment.width;
        } else if (segment.widthPercent != null) {
          segmentStyle.width = `${segment.widthPercent}%`;
        }

        const segmentClasses = [
          styles.segment,
          segment.flex && styles.widthFlex,
          segment.halfHeight && styles.halfHeight,
          segment.className,
        ]
          .filter(Boolean)
          .join(' ');

        return <div key={index} className={segmentClasses} style={segmentStyle} />;
      })}
    </div>
  );
};
