/**
 * shortcuts — shape of a registered global shortcut.
 *
 * A shortcut is a description of a key combination + a behavior policy
 * (run while typing? only when focus is outside inputs?) + an action.
 * The shape stays small on purpose: the system's expressive power comes
 * from composing these rather than making any one field clever.
 */

export type WhenTypingPolicy = 'allow' | 'block';

export interface Shortcut {
  /** Stable identifier for the binding (used in tests + help overlay). */
  id: string;
  /** Human-readable description surfaced in the shortcut help overlay. */
  description: string;
  /**
   * The key to match. Compared case-insensitively against
   * `event.key.toLowerCase()`. For letter keys use the lowercase letter
   * ("k"); for punctuation use the character itself ("?", "/"); for named
   * keys use the `KeyboardEvent.key` spelling ("Escape", "ArrowDown").
   */
  key: string;
  /** Require Cmd on macOS / Ctrl elsewhere. Defaults to false. */
  mod?: boolean;
  /** Require Shift. Defaults to false. */
  shift?: boolean;
  /** Require Alt/Option. Defaults to false. */
  alt?: boolean;
  /**
   * Whether the binding fires while the user is typing in an input /
   * textarea / contentEditable element. Most bindings want 'block'
   * (default) so typing "j" in an editor doesn't collapse the console;
   * palette-style bindings use 'allow' so ⌘K works from anywhere.
   */
  whenTyping?: WhenTypingPolicy;
  /** Action executed when the binding matches. */
  run: () => void;
}

/**
 * Format a shortcut for display in the help overlay.
 *
 * We normalize to ⌘/⌥/⇧/⌃ on macOS and Ctrl/Alt/Shift on other platforms
 * so the help text reads naturally for the user's OS. The key segment is
 * uppercased letters but left verbatim for punctuation / named keys.
 */
export function formatShortcut(shortcut: Shortcut, isMac: boolean): string {
  const parts: string[] = [];
  if (shortcut.mod) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  parts.push(key);
  return parts.join(isMac ? '' : '+');
}

/**
 * Detect the Mac platform. Mirrors the check in useZoneState so both
 * shortcut hooks behave consistently with respect to mod key semantics.
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}
