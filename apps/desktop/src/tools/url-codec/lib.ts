/**
 * Pure URL encoding/decoding operations for the URL Codec tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable and can be reused by a potential future
 * backend-accelerated path. The tool component is the only thing that
 * wires these functions up to UI state.
 *
 * URL encoding is subtly different from URI encoding:
 *   - `encodeURIComponent` escapes every reserved character (/, ?, #, &, =, +, etc).
 *   - `encodeURI` preserves URI separators (/, :, @, ?, &, =, +).
 * This tool exposes both as "component" and "uri" modes so users can pick
 * exactly what they need.
 *
 * Additionally, form data and some legacy systems use `+` for space instead
 * of `%20`. We provide "plus-as-space" and "standard" modes to toggle this.
 */

export type UrlCodecMode = 'component' | 'uri';
export type PlusMode = 'standard' | 'plus-as-space';

export interface UrlOptions {
  mode: UrlCodecMode;
  plusMode: PlusMode;
}

export interface UrlEncodeOk {
  kind: 'ok';
  text: string;
}

export interface UrlDecodeOk {
  kind: 'ok';
  text: string;
}

export interface UrlDecodeError {
  kind: 'error';
  message: string;
  /** 0-based byte offset into the input where the error starts. */
  offset: number | null;
}

export interface UrlEmpty {
  kind: 'empty';
}

export type UrlEncodeResult = UrlEncodeOk | UrlEmpty;
export type UrlDecodeResult = UrlDecodeOk | UrlDecodeError | UrlEmpty;

/**
 * Encode a URL string using the specified options.
 *
 * Returns `empty` for blank / whitespace-only input so the UI can render
 * a "waiting for input" status rather than an error.
 */
export function encodeUrl(text: string, options: UrlOptions): UrlEncodeResult {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }

  let result: string;

  // Handle plus-as-space: encode space as `+` instead of `%20`.
  const processedText =
    options.plusMode === 'plus-as-space'
      ? text.replaceAll(' ', '\x00') // Placeholder for space
      : text;

  // Apply the appropriate encoding function.
  if (options.mode === 'component') {
    result = encodeURIComponent(processedText);
  } else {
    result = encodeURI(processedText);
  }

  // Swap placeholder back to `+` if plus-as-space is active.
  if (options.plusMode === 'plus-as-space') {
    result = result.replaceAll('%00', '+');
  }

  return { kind: 'ok', text: result };
}

/**
 * Decode a URL string using the specified options.
 *
 * Returns `empty` for blank / whitespace-only input. On invalid percent-
 * encoded sequences (e.g., "%ZZ", "%2"), returns `error` with the byte
 * offset of the first malformed `%XX`.
 */
export function decodeUrl(text: string, options: UrlOptions): UrlDecodeResult {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }

  // Handle plus-as-space: swap `+` → space before percent-decoding.
  const processedText =
    options.plusMode === 'plus-as-space'
      ? text.replaceAll('+', ' ')
      : text;

  try {
    // `decodeURIComponent` handles both component and uri encoded input
    // correctly. We use it for both modes because the difference is in
    // what gets encoded on the forward path; on decode, both paths converge.
    const result = decodeURIComponent(processedText);
    return { kind: 'ok', text: result };
  } catch (err) {
    // `decodeURIComponent` throws URIError on invalid sequences.
    // Find the first malformed `%XX` for a precise offset hint.
    const match = processedText.match(/%(?![0-9A-Fa-f]{2})/);
    const offset = match ? match.index ?? null : null;
    return {
      kind: 'error',
      message: 'Invalid percent-encoding sequence (expected %XX where X is 0-9 or A-F)',
      offset,
    };
  }
}
