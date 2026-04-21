import type { CSSProperties, FC, ReactNode } from 'react';
import styles from './LcarsBanner.module.css';

export interface LcarsBannerProps {
  children: ReactNode;
  color?: string;
  size?: 'large' | 'compact';
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsBanner — right-aligned uppercase title band.
 * The shell uses `compact` for zone headers; `large` is reserved for
 * the home/launchpad view.
 */
export const LcarsBanner: FC<LcarsBannerProps> = ({
  children,
  color,
  size = 'large',
  className = '',
  style = {},
}) => {
  const bannerStyle: CSSProperties = {
    ...style,
    ...(color ? ({ '--banner-color': color } as CSSProperties) : {}),
  };

  return (
    <div className={`${styles.banner} ${styles[size]} ${className}`} style={bannerStyle}>
      {children}
    </div>
  );
};
