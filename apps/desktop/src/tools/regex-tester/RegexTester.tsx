import { useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import {
  runRegex,
  type RegexFlags,
  type RegexMatch,
  type RegexRunResult,
} from './lib';
import styles from './RegexTester.module.css';

export interface RegexTesterProps {
  toolId: string;
  zone?: Zone;
}

interface RegexTesterState {
  pattern: string;
  flags: RegexFlags;
  sample: string;
  previewOn: boolean;
}

const DEFAULT_STATE: RegexTesterState = {
  pattern: '',
  flags: { g: true, i: false, m: false, s: false, u: false, y: false },
  sample: '',
  previewOn: true,
};

const SAMPLE_REGEX = 'hello|world';
const SAMPLE_TEXT = `hello world
hello there
goodbye world`;

/**
 * Regex Tester — test regex patterns with live feedback.
 *
 * Three inputs stacked top to bottom:
 *   1. Pattern: single-line input with `/` prefix and `/<flags>` suffix chrome.
 *   2. Flags: toggleable LcarsPill cluster for g, i, m, s, u, y.
 *   3. Sample: multi-line textarea.
 * Below the sample: match list showing count, offsets, and groups.
 * Optional "Highlighted preview" with matches wrapped in <mark>.
 * Action cluster: Clear and optionally Sample.
 */
export const RegexTester: FC<RegexTesterProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<RegexTesterState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  // Derive the regex run result on every render.
  const regexResult = useMemo<RegexRunResult>(
    () => runRegex(state.pattern, state.flags, state.sample),
    [state.pattern, state.flags, state.sample],
  );

  const handlePatternChange = useCallback(
    (pattern: string) => {
      setState({ pattern });
    },
    [setState],
  );

  const handleSampleChange = useCallback(
    (sample: string) => {
      setState({ sample });
    },
    [setState],
  );

  const handleFlagToggle = useCallback(
    (flagName: keyof RegexFlags) => {
      setState({
        flags: {
          ...state.flags,
          [flagName]: !state.flags[flagName],
        },
      });
    },
    [state.flags, setState],
  );

  const handlePreviewToggle = useCallback(() => {
    setState({ previewOn: !state.previewOn });
  }, [state.previewOn, setState]);

  const handleClear = useCallback(() => {
    setState({ pattern: '', sample: '' });
  }, [setState]);

  const handleSample = useCallback(() => {
    setState({ pattern: SAMPLE_REGEX, sample: SAMPLE_TEXT });
  }, [setState]);

  const buildFlagString = (): string => {
    let flags = '';
    if (state.flags.g) flags += 'g';
    if (state.flags.i) flags += 'i';
    if (state.flags.m) flags += 'm';
    if (state.flags.s) flags += 's';
    if (state.flags.u) flags += 'u';
    if (state.flags.y) flags += 'y';
    return flags;
  };

  const status = renderStatus(regexResult);

  const flagPills = (
    <div>
      <div className={styles.flagsLabel}>Flags</div>
      <div className={styles.flagsCluster}>
        {(['g', 'i', 'm', 's', 'u', 'y'] as const).map((flag) => (
          <button
            key={flag}
            className={styles.flagPill}
            onClick={() => handleFlagToggle(flag)}
            aria-pressed={state.flags[flag]}
            aria-label={`Toggle ${flag} flag`}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '4px',
              border: `1px solid ${
                state.flags[flag]
                  ? 'var(--lcars-color-orange, #d88463)'
                  : 'var(--lcars-color-gutter, rgba(138, 122, 168, 0.4))'
              }`,
              background: state.flags[flag]
                ? 'rgba(216, 132, 99, 0.2)'
                : 'var(--lcars-color-bg-raised, rgba(16, 16, 24, 0.7))',
              color: 'var(--lcars-color-sand, #eae4d6)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {flag}
          </button>
        ))}
      </div>
    </div>
  );

  const actions = (
    <>
      <LcarsPill
        size={isCompact ? 'small' : 'medium'}
        onClick={state.pattern.length === 0 && state.sample.length === 0 ? handleSample : handleClear}
        aria-label={
          state.pattern.length === 0 && state.sample.length === 0
            ? 'Load a sample regex + text'
            : 'Clear pattern and sample'
        }
      >
        {state.pattern.length === 0 && state.sample.length === 0 ? 'Sample' : 'Clear'}
      </LcarsPill>
    </>
  );

  const matchesDisplay = renderMatchList(regexResult, isCompact);
  const highlightedPreview = renderHighlightedPreview(
    state.sample,
    regexResult,
    state.previewOn,
    isCompact,
  );

  return (
    <ToolFrame
      toolId={toolId}
      title="Regex Tester"
      subtitle="Build and test regex patterns with live match feedback."
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={`${styles.container} ${isCompact ? styles.containerCompact : ''}`}>
        {/* Pattern input with prefix/suffix chrome. */}
        <div className={styles.inputGroup}>
          <div className={styles.patternWrap}>
            <span className={styles.patternPrefix}>/</span>
            <input
              type="text"
              className={`${styles.pattern} ${isCompact ? styles.patternCompact : ''}`}
              value={state.pattern}
              onChange={(e) => handlePatternChange(e.currentTarget.value)}
              placeholder="e.g. hello|world"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Regex pattern"
            />
            <span className={styles.patternSuffix}>/{buildFlagString()}</span>
          </div>
        </div>

        {/* Flags cluster. */}
        {flagPills}

        {/* Sample text input. */}
        <div>
          <div className={styles.sampleLabel}>Sample Text</div>
          <textarea
            className={`${styles.sample} ${isCompact ? styles.sampleCompact : ''}`}
            value={state.sample}
            onChange={(e) => handleSampleChange(e.currentTarget.value)}
            placeholder="Paste text to test against"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Sample text input"
          />
        </div>

        {/* Match list. */}
        <div className={`${styles.matchList} ${isCompact ? styles.matchListCompact : ''}`}>
          {matchesDisplay}
        </div>

        {/* Highlighted preview (optional toggle). */}
        <div>
          <label className={styles.previewSectionLabel}>
            <input
              type="checkbox"
              className={styles.previewToggle}
              checked={state.previewOn}
              onChange={handlePreviewToggle}
              aria-label="Toggle highlighted preview"
            />
            Highlighted Preview
          </label>
          {state.previewOn && highlightedPreview}
        </div>
      </div>
    </ToolFrame>
  );
};

/**
 * Render the status footer based on the current regex result.
 */
function renderStatus(result: RegexRunResult): ReactNode {
  if (result.kind === 'empty') {
    return (
      <ToolStatusPill status="neutral" detail="Enter a regex pattern">
        Ready
      </ToolStatusPill>
    );
  }

  if (result.kind === 'error') {
    return (
      <ToolStatusPill status="error" detail={result.message}>
        Invalid Pattern
      </ToolStatusPill>
    );
  }

  // result.kind === 'ok'
  const count = result.matches.length;
  const countLabel = count === 1 ? '1 match' : `${count} matches`;
  const detail = result.truncated ? `${countLabel} (truncated)` : countLabel;

  return (
    <ToolStatusPill status="ok" detail={detail}>
      Valid
    </ToolStatusPill>
  );
}

/**
 * Render the match list panel.
 */
function renderMatchList(
  result: RegexRunResult,
  isCompact: boolean,
): ReactNode {
  if (result.kind === 'empty') {
    return (
      <div className={styles.matchListEmpty}>
        No pattern entered
      </div>
    );
  }

  if (result.kind === 'error') {
    return (
      <div className={styles.matchListEmpty}>
        Invalid pattern
      </div>
    );
  }

  // result.kind === 'ok'
  if (result.matches.length === 0) {
    return (
      <div className={styles.matchListEmpty}>
        No matches found
      </div>
    );
  }

  // Show top 20 matches in compact mode, all in full mode.
  const maxShow = isCompact ? 20 : result.matches.length;
  const shown = result.matches.slice(0, maxShow);
  const hidden = Math.max(0, result.matches.length - maxShow);

  return (
    <>
      <div className={styles.matchListHeader}>
        {result.matches.length} match{result.matches.length === 1 ? '' : 'es'}
        {result.truncated ? ' (truncated)' : ''}
      </div>
      <div className={styles.matchItems}>
        {shown.map((match, idx) => (
          <div
            key={idx}
            className={`${styles.matchItem} ${isCompact ? styles.matchItemCompact : ''}`}
          >
            <div className={styles.matchItemIndex}>
              Match {match.index + 1} at [{match.start}..{match.end}]
            </div>
            <div className={styles.matchItemValue}>
              <code>"{match.match}"</code>
            </div>
            {match.groups.length > 0 && (
              <div className={styles.groupsList}>
                {match.groups.map((group, gIdx) => {
                  const label = group.name ? `?<${group.name}>` : String(gIdx + 1);
                  return (
                    <div key={gIdx} className={styles.groupItem}>
                      <code>
                        {label}: "{group.value ?? ''}"
                      </code>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {hidden > 0 && (
          <div
            className={`${styles.matchItem} ${isCompact ? styles.matchItemCompact : ''}`}
            style={{ opacity: 0.5, fontStyle: 'italic' }}
          >
            ... and {hidden} more
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Render a preview of the sample text with matches highlighted.
 * Walks matches left-to-right, skipping overlaps.
 */
function renderHighlightedPreview(
  sample: string,
  result: RegexRunResult,
  previewOn: boolean,
  isCompact: boolean,
): ReactNode {
  if (!previewOn) {
    return null;
  }

  if (result.kind !== 'ok' || result.matches.length === 0) {
    return (
      <div className={`${styles.preview} ${isCompact ? styles.previewCompact : ''}`}>
        <div className={styles.previewEmpty}>
          {result.kind === 'ok' ? 'No matches to highlight' : 'Invalid pattern'}
        </div>
      </div>
    );
  }

  // Build a map of which ranges are covered by non-overlapping matches.
  const covered = new Set<number>();
  const nonOverlapping: RegexMatch[] = [];

  for (const match of result.matches) {
    let overlaps = false;
    for (let i = match.start; i < match.end; i++) {
      if (covered.has(i)) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      nonOverlapping.push(match);
      for (let i = match.start; i < match.end; i++) {
        covered.add(i);
      }
    }
  }

  // Build the highlighted preview by walking the sample and inserting <mark> tags.
  const parts: ReactNode[] = [];
  let lastEnd = 0;

  for (const match of nonOverlapping) {
    if (lastEnd < match.start) {
      parts.push(sample.substring(lastEnd, match.start));
    }
    parts.push(
      <mark key={`match-${match.start}`}>
        {sample.substring(match.start, match.end)}
      </mark>,
    );
    lastEnd = match.end;
  }

  if (lastEnd < sample.length) {
    parts.push(sample.substring(lastEnd));
  }

  return (
    <div className={`${styles.preview} ${isCompact ? styles.previewCompact : ''}`}>
      {parts}
    </div>
  );
}
