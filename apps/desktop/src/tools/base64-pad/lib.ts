/**
 * Pure Base64 encode/decode operations for the Base64 Pad tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable. All functions return discriminated unions
 * rather than throwing.
 *
 * Encoding uses TextEncoder + btoa with optional URL-safe variant.
 * Decoding accepts both standard and URL-safe input regardless of the
 * options.variant setting (detects which was used) and adds padding as needed.
 */

export type Base64Variant = 'standard' | 'url-safe';
export type Base64Padding = 'pad' | 'strip';

export interface Base64Options {
  variant: Base64Variant;
  padding: Base64Padding;
}

export interface Base64EncodeOk {
  kind: 'ok';
  text: string;
  bytes: number;
}

export interface Base64EncodeEmpty {
  kind: 'empty';
}

export type EncodeResult = Base64EncodeOk | Base64EncodeEmpty;

export interface Base64DecodeOk {
  kind: 'ok';
  text: string;
  bytes: number;
}

export interface Base64DecodeError {
  kind: 'error';
  message: string;
}

export interface Base64DecodeEmpty {
  kind: 'empty';
}

export type DecodeResult = Base64DecodeOk | Base64DecodeError | Base64DecodeEmpty;

/**
 * Encode plain text to base64.
 *
 * Returns `empty` for blank / whitespace-only input so the UI can render
 * a "waiting for input" status rather than an error.
 */
export function encodeBase64(text: string, options: Base64Options): EncodeResult {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }

  // TextEncoder produces UTF-8 bytes; btoa expects a binary string (one char per byte).
  const utf8Bytes = new TextEncoder().encode(text);
  const binaryString = String.fromCharCode(...utf8Bytes);
  let encoded = btoa(binaryString);

  // Convert to URL-safe variant if requested
  if (options.variant === 'url-safe') {
    encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_');
  }

  // Strip trailing padding if requested
  if (options.padding === 'strip') {
    encoded = encoded.replace(/=+$/, '');
  }

  return {
    kind: 'ok',
    text: encoded,
    bytes: utf8Bytes.length,
  };
}

/**
 * Decode base64 to plain text.
 *
 * Accepts both standard (+ /) and URL-safe (- _) base64 regardless of
 * options.variant (detects which was used). Also accepts unpadded input
 * by adding padding internally before decoding.
 *
 * Returns `empty` for blank / whitespace-only input.
 */
export function decodeBase64(b64: string, options: Base64Options): DecodeResult {
  const trimmed = b64.trim();
  if (trimmed.length === 0) {
    return { kind: 'empty' };
  }

  try {
    // Detect which variant was used and normalize to standard for atob
    let normalized = trimmed;
    let detectedVariant = options.variant;

    if (normalized.includes('-') || normalized.includes('_')) {
      detectedVariant = 'url-safe';
      normalized = normalized.replace(/-/g, '+').replace(/_/g, '/');
    }

    // Add padding if missing: base64 length must be multiple of 4
    const padLength = normalized.length % 4;
    if (padLength !== 0) {
      normalized += '='.repeat(4 - padLength);
    }

    // Validate base64 characters
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
      // Find first invalid character for error message
      const match = normalized.match(/[^A-Za-z0-9+/=]/);
      const invalidChar = match ? match[0] : '?';
      const position = match ? normalized.indexOf(invalidChar) : -1;
      const posStr = position >= 0 ? ` at position ${position}` : '';
      return {
        kind: 'error',
        message: `Invalid base64 character '${invalidChar}'${posStr}`,
      };
    }

    // Decode using atob (which expects binary string)
    let binaryString: string;
    try {
      binaryString = atob(normalized);
    } catch (err) {
      return {
        kind: 'error',
        message: 'Invalid base64: incorrect padding or length',
      };
    }

    // Convert binary string to UTF-8 bytes
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decode UTF-8 bytes to text
    let text: string;
    try {
      text = new TextDecoder().decode(bytes);
    } catch (err) {
      return {
        kind: 'error',
        message: 'Invalid UTF-8 in decoded bytes',
      };
    }

    return {
      kind: 'ok',
      text,
      bytes: bytes.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: 'error',
      message: `Decoding failed: ${message}`,
    };
  }
}
