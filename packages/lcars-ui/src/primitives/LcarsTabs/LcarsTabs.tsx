import { useEffect, useState } from 'react';
import type { CSSProperties, FC, ReactNode } from 'react';
import styles from './LcarsTabs.module.css';

export interface LcarsTab {
  id: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export type TabsOrientation = 'horizontal' | 'vertical';

export interface LcarsTabsProps {
  tabs: LcarsTab[];
  /** Uncontrolled default. Ignored when `activeTab` is provided. */
  defaultTab?: string;
  /** Controlled active tab id. */
  activeTab?: string;
  orientation?: TabsOrientation;
  /** Background color for the active tab. Falls back to --lcars-color-orange. */
  activeColor?: string;
  /** Background color for inactive tabs. Falls back to --lcars-color-african-violet. */
  inactiveColor?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * LcarsTabs — tabbed container. Supports horizontal and vertical orientation.
 * Controlled via `activeTab` prop, or uncontrolled via `defaultTab`.
 */
export const LcarsTabs: FC<LcarsTabsProps> = ({
  tabs,
  defaultTab,
  activeTab,
  orientation = 'horizontal',
  activeColor,
  inactiveColor,
  onChange,
  className = '',
  style = {},
}) => {
  const isControlled = activeTab !== undefined;
  const [internalActive, setInternalActive] = useState(defaultTab ?? tabs[0]?.id);

  useEffect(() => {
    if (!isControlled && internalActive && !tabs.find((t) => t.id === internalActive)) {
      setInternalActive(tabs[0]?.id);
    }
  }, [tabs, isControlled, internalActive]);

  const currentId = isControlled ? activeTab : internalActive;

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || tab.disabled) return;
    if (!isControlled) setInternalActive(tabId);
    onChange?.(tabId);
  };

  const containerStyle: CSSProperties = {
    ...style,
    ...(activeColor ? ({ '--tab-active-color': activeColor } as CSSProperties) : {}),
    ...(inactiveColor ? ({ '--tab-inactive-color': inactiveColor } as CSSProperties) : {}),
  };

  const containerClasses = [styles.tabsContainer, styles[orientation], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} style={containerStyle}>
      <div className={styles.tabList} role="tablist" aria-orientation={orientation}>
        {tabs.map((tab) => {
          const isActive = tab.id === currentId;
          const tabClasses = [
            styles.tab,
            isActive && styles.active,
            tab.disabled && styles.disabled,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`lcars-tabpanel-${tab.id}`}
              id={`lcars-tab-${tab.id}`}
              className={tabClasses}
              onClick={() => handleTabChange(tab.id)}
              disabled={tab.disabled}
              type="button"
            >
              {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
              <span className={styles.label}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.tabPanels}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`lcars-tabpanel-${tab.id}`}
            aria-labelledby={`lcars-tab-${tab.id}`}
            hidden={tab.id !== currentId}
            className={styles.tabPanel}
          >
            {tab.id === currentId && tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};
