/**
 * Pure text diffing operations for the Text Diff tool.
 *
 * Uses the `diff` package (jsdiff) rather than diff-match-patch for:
 *   - Direct line-level API (diffLines) + word-level API (diffWordsWithSpace) that
 *     compose cleanly for side-by-side rendering.
 *   - Smaller bundle (~30KB vs ~140KB).
 *   - Well-typed out of the box with @types/diff.
 *
 * This module is pure: no React, Tauri, or store imports. It can be
 * unit-tested in node env and reused by a future backend-accelerated path.
 */

import { diffLines, diffWordsWithSpace } from 'diff';

export interface DiffOk {
  kind: 'ok';
  hunks: DiffHunk[];
  stats: { added: number; removed: number; modified: number; unchanged: number };
  /** true when left === right AND both non-empty */
  identical: boolean;
}

export interface DiffEmpty {
  kind: 'empty';
}

export type DiffResult = DiffOk | DiffEmpty;

export type DiffHunkKind = 'unchanged' | 'added' | 'removed' | 'modified';

export interface DiffHunk {
  kind: DiffHunkKind;
  leftLine?: LineEntry;
  rightLine?: LineEntry;
}

export interface LineEntry {
  number: number;
  text: string;
  inline?: InlineChange[];
}

export interface InlineChange {
  kind: 'unchanged' | 'added' | 'removed';
  text: string;
}

/**
 * Compute the side-by-side diff of two text strings.
 *
 * Algorithm:
 *   1. Empty-case short-circuit: both empty or whitespace-only → { kind: 'empty' }
 *   2. Call diffLines(left, right) to get line-level changes.
 *   3. Walk the output and build hunks:
 *      - unchanged entries → one hunk per line
 *      - removed + added pairs → 'modified' hunks with word-level inline[]
 *      - standalone removed/added → pure 'removed'/'added' hunks
 *   4. Track line numbers and stats.
 *   5. Set identical flag when stats show no changes and hunks present.
 */
export function diffTexts(left: string, right: string): DiffResult {
  // Empty-case short-circuit
  if (left.trim().length === 0 && right.trim().length === 0) {
    return { kind: 'empty' };
  }

  try {
    const hunks: DiffHunk[] = [];
    let leftLineNum = 1;
    let rightLineNum = 1;
    let stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };

    // Perform line-level diff
    const lineDiff = diffLines(left, right, { newlineIsToken: false });

    let i = 0;
    while (i < lineDiff.length) {
      const entry = lineDiff[i];

      if (!entry.added && !entry.removed) {
        // Unchanged block — split by line and emit hunks
        const lines = entry.value.split('\n');
        for (const line of lines) {
          if (line === '' && lines[lines.length - 1] === '') {
            // Skip the final empty string from splitting "a\nb\n"
            continue;
          }
          hunks.push({
            kind: 'unchanged',
            leftLine: { number: leftLineNum, text: line },
            rightLine: { number: rightLineNum, text: line },
          });
          leftLineNum++;
          rightLineNum++;
        }
        stats.unchanged += lines.filter((l) => l !== '' || lines[lines.length - 1] !== '').length;
        i++;
      } else if (entry.removed && i + 1 < lineDiff.length && lineDiff[i + 1].added) {
        // Removed + added pair. Pairing strategy:
        //   - Single-line edit on each side (e.g. fix a typo on one
        //     line): always treat as "modified" with word-level inline
        //     diff, even if the two lines share no characters
        //     (`'hello'` → `'world'` still reads as a one-line edit).
        //   - Multi-line block on either side: pair line-by-line up to
        //     the shorter length, then check word-level overlap per
        //     pair. If a pair has at least one unchanged word, it's a
        //     real modification (`'old line 2'` → `'new line 2'` shares
        //     `'line'` and `'2'`). If a pair has no unchanged words
        //     (e.g. jsdiff bundled non-adjacent delete + add into one
        //     paired chunk because the lines between were a short LCS
        //     match), demote that pair to two standalone hunks — one
        //     removed, one added — so the stats reflect the user's
        //     intent rather than a coincidental positional alignment.
        const removed = lineDiff[i];
        const added = lineDiff[i + 1];

        const removedLines = removed.value.split('\n').filter((l, idx, arr) => {
          return !(l === '' && idx === arr.length - 1);
        });
        const addedLines = added.value.split('\n').filter((l, idx, arr) => {
          return !(l === '' && idx === arr.length - 1);
        });

        const pairCount = Math.min(removedLines.length, addedLines.length);
        const isSingleLineEdit = removedLines.length === 1 && addedLines.length === 1;

        for (let j = 0; j < pairCount; j++) {
          const leftText = removedLines[j];
          const rightText = addedLines[j];
          const wordDiff = diffWordsWithSpace(leftText, rightText);

          // A pair is a "real" modification if any non-whitespace word
          // is preserved across both sides. Single-line edits are
          // always real modifications regardless of overlap.
          const hasUnchangedWord = wordDiff.some(
            (wd) => !wd.added && !wd.removed && wd.value.trim() !== '',
          );

          if (isSingleLineEdit || hasUnchangedWord) {
            const inline: InlineChange[] = wordDiff.map((wd) => ({
              kind: wd.added ? 'added' : wd.removed ? 'removed' : 'unchanged',
              text: wd.value,
            }));
            hunks.push({
              kind: 'modified',
              leftLine: { number: leftLineNum, text: leftText, inline },
              rightLine: { number: rightLineNum, text: rightText, inline },
            });
            stats.modified++;
          } else {
            hunks.push({
              kind: 'removed',
              leftLine: { number: leftLineNum, text: leftText },
            });
            stats.removed++;
            hunks.push({
              kind: 'added',
              rightLine: { number: rightLineNum, text: rightText },
            });
            stats.added++;
          }

          leftLineNum++;
          rightLineNum++;
        }

        // Leftover lines in removed block → pure 'removed' hunks
        for (let j = pairCount; j < removedLines.length; j++) {
          hunks.push({
            kind: 'removed',
            leftLine: { number: leftLineNum, text: removedLines[j] },
          });
          leftLineNum++;
          stats.removed++;
        }

        // Leftover lines in added block → pure 'added' hunks
        for (let j = pairCount; j < addedLines.length; j++) {
          hunks.push({
            kind: 'added',
            rightLine: { number: rightLineNum, text: addedLines[j] },
          });
          rightLineNum++;
          stats.added++;
        }

        i += 2;
      } else if (entry.removed) {
        // Standalone removed block
        const lines = entry.value.split('\n').filter((l, idx, arr) => {
          return !(l === '' && idx === arr.length - 1);
        });
        for (const line of lines) {
          hunks.push({
            kind: 'removed',
            leftLine: { number: leftLineNum, text: line },
          });
          leftLineNum++;
          stats.removed++;
        }
        i++;
      } else if (entry.added) {
        // Standalone added block
        const lines = entry.value.split('\n').filter((l, idx, arr) => {
          return !(l === '' && idx === arr.length - 1);
        });
        for (const line of lines) {
          hunks.push({
            kind: 'added',
            rightLine: { number: rightLineNum, text: line },
          });
          rightLineNum++;
          stats.added++;
        }
        i++;
      } else {
        i++;
      }
    }

    const identical =
      stats.added === 0 && stats.removed === 0 && stats.modified === 0 && hunks.length > 0;

    return {
      kind: 'ok',
      hunks,
      stats,
      identical,
    };
  } catch (err) {
    // Defensive: if jsdiff throws for exotic input, return a minimal sensible result.
    // In practice jsdiff is quite robust and this should never fire.
    return { kind: 'empty' };
  }
}

/**
 * UTF-8 byte length of a string.
 * Used for size readouts in the status bar.
 */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
