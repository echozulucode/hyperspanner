import { useState } from 'react';
import type { FC } from 'react';
import { LcarsPanel } from '@hyperspanner/lcars-ui';
import { useTheme } from '../../../contexts/ThemeContext';
import styles from './PanelButtonStackScreen.module.css';

/**
 * PanelButtonStackScreen (S4) — de-risk the LcarsPanel vertical-stack pattern.
 *
 * Pressure-test: canonical vertical button stacks (LIGHTS / CAMERAS / ENERGY).
 * Render 3 side-by-side stacks with different configurations:
 *   1. 3-button stack (basic flex sizing)
 *   2. 5-button stack (more varied sizing)
 *   3. Seamless tail (last panel without seam)
 */
export const PanelButtonStackScreen: FC = () => {
  const { theme } = useTheme();
  const [activeStack1, setActiveStack1] = useState<'lights' | 'cameras' | 'energy'>('cameras');
  const [activeStack2, setActiveStack2] = useState<number>(2);
  const [activeStack3, setActiveStack3] = useState<'a' | 'b' | 'c'>('b');

  return (
    <div className={styles.container}>
      <div className={styles.heading}>LcarsPanel Vertical Stack Pressure Test</div>

      <div className={styles.stackGrid}>
        {/* ─── Stack 1: 3-BUTTON ────────────────────────────────────── */}
        <div className={styles.stackColumn}>
          <div className={styles.stackLabel}>3-BUTTON STACK</div>
          <div className={styles.stack}>
            <LcarsPanel
              size="flex"
              color={theme.colors.africanViolet}
              active={activeStack1 === 'lights'}
              onClick={() => setActiveStack1('lights')}
            >
              LIGHTS
            </LcarsPanel>
            <LcarsPanel
              size="flex"
              color={theme.colors.butterscotch}
              active={activeStack1 === 'cameras'}
              onClick={() => setActiveStack1('cameras')}
            >
              CAMERAS
            </LcarsPanel>
            <LcarsPanel
              size="flex"
              color={theme.colors.red}
              seamless
              active={activeStack1 === 'energy'}
              onClick={() => setActiveStack1('energy')}
            >
              ENERGY
            </LcarsPanel>
          </div>
        </div>

        {/* ─── Stack 2: 5-BUTTON ────────────────────────────────────── */}
        <div className={styles.stackColumn}>
          <div className={styles.stackLabel}>5-BUTTON STACK</div>
          <div className={styles.stack}>
            <LcarsPanel
              size="flex"
              color={theme.colors.bluey}
              active={activeStack2 === 0}
              onClick={() => setActiveStack2(0)}
            >
              SENSOR 1
            </LcarsPanel>
            <LcarsPanel
              size="flex"
              color={theme.colors.butterscotch}
              active={activeStack2 === 1}
              onClick={() => setActiveStack2(1)}
            >
              SENSOR 2
            </LcarsPanel>
            <LcarsPanel
              size="flex"
              color={theme.colors.orange}
              active={activeStack2 === 2}
              onClick={() => setActiveStack2(2)}
            >
              SENSOR 3
            </LcarsPanel>
            <LcarsPanel
              size="flex"
              color={theme.colors.africanViolet}
              active={activeStack2 === 3}
              onClick={() => setActiveStack2(3)}
            >
              SENSOR 4
            </LcarsPanel>
            <LcarsPanel
              size="flex"
              color={theme.colors.red}
              seamless
              active={activeStack2 === 4}
              onClick={() => setActiveStack2(4)}
            >
              SENSOR 5
            </LcarsPanel>
          </div>
        </div>

        {/* ─── Stack 3: SEAMLESS TAIL ───────────────────────────────── */}
        <div className={styles.stackColumn}>
          <div className={styles.stackLabel}>SEAMLESS TAIL</div>
          <div className={styles.stack}>
            <LcarsPanel
              size="flex"
              color={theme.colors.butterscotch}
              active={activeStack3 === 'a'}
              onClick={() => setActiveStack3('a')}
            >
              ALPHA
            </LcarsPanel>
            <LcarsPanel
              size="flex"
              color={theme.colors.orange}
              active={activeStack3 === 'b'}
              onClick={() => setActiveStack3('b')}
            >
              BETA
            </LcarsPanel>
            <LcarsPanel
              size="flex"
              color={theme.colors.red}
              seamless
              active={activeStack3 === 'c'}
              onClick={() => setActiveStack3('c')}
            >
              GAMMA
            </LcarsPanel>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        Each stack uses CSS grid columns so they sit side-by-side. Last panel in each stack has seamless prop.
      </div>
    </div>
  );
};
