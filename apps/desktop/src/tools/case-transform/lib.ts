/**
 * Pure case transformation operations for the Case Transform tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable and can be reused by a potential future
 * backend-accelerated path. The tool component is the only thing that
 * wires these functions up to UI state.
 */

export type CaseMode =
  | 'camelCase'
  | 'PascalCase'
  | 'snake_case'
  | 'kebab-case'
  | 'CONSTANT_CASE'
  | 'lower case'
  | 'UPPER CASE';

export interface TransformOk {
  kind: 'ok';
  text: string;
}

export interface TransformEmpty {
  kind: 'empty';
}

export type TransformResult = TransformOk | TransformEmpty;

/**
 * Transform text into the specified case mode.
 *
 * Returns `empty` for blank / whitespace-only input so the UI can render
 * a "waiting for input" status rather than an error.
 */
export function transformCase(text: string, mode: CaseMode): TransformResult {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }

  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { kind: 'empty' };
  }

  const result = applyMode(tokens, mode);
  return { kind: 'ok', text: result };
}

/**
 * Tokenize text by splitting on whitespace, punctuation, case-boundary
 * transitions, and digit boundaries. This is the canonical identifier
 * tokenization approach.
 *
 * Examples:
 *   "helloWorld" → ["hello", "World"]
 *   "hello_world" → ["hello", "world"]
 *   "hello-world" → ["hello", "world"]
 *   "hello world" → ["hello", "world"]
 *   "HelloWORLDFoo" → ["Hello", "WORLD", "Foo"]
 *   "user_id_42" → ["user", "id", "42"]
 *   "a" → ["a"]
 *   "A" → ["A"]
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prev = i > 0 ? text[i - 1] : '';
    const next = i < text.length - 1 ? text[i + 1] : '';

    const isWhitespace = /\s/.test(char);
    const isPunctuation = /[_\-\s]/.test(char);
    const isDigit = /\d/.test(char);
    const isPrevDigit = /\d/.test(prev);
    const isNextDigit = /\d/.test(next);
    const isUpper = /[A-Z]/.test(char);
    const isPrevUpper = /[A-Z]/.test(prev);
    const isNextLower = /[a-z]/.test(next);

    // Start a new token on whitespace/punctuation separators
    if (isWhitespace || isPunctuation) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    // Digit-boundary transitions (e.g., "id42" → ["id", "42"])
    if (isDigit && !isPrevDigit && current) {
      tokens.push(current);
      current = char;
      continue;
    }
    if (!isDigit && isPrevDigit && current) {
      tokens.push(current);
      current = char;
      continue;
    }

    // Case-boundary transitions
    // "camelCase" transition: lowercase→uppercase (e.g., "hello" + "World")
    if (isUpper && !isPrevUpper && current) {
      tokens.push(current);
      current = char;
      continue;
    }

    // "HELLOWorld" transition: uppercase-run→lowercase (e.g., "HELLO" + "World")
    if (isUpper && isPrevUpper && isNextLower && current.length > 1) {
      // Pop the last uppercase char from current, push the accumulated run
      tokens.push(current.slice(0, -1));
      current = char;
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens.filter((t) => t.length > 0);
}

// ----- internals ------------------------------------------------------

function applyMode(tokens: string[], mode: CaseMode): string {
  const normalized = tokens.map((t) => t.toLowerCase());

  switch (mode) {
    case 'camelCase':
      return normalized
        .map((t, i) => (i === 0 ? t : capitalize(t)))
        .join('');

    case 'PascalCase':
      return normalized.map((t) => capitalize(t)).join('');

    case 'snake_case':
      return normalized.join('_');

    case 'kebab-case':
      return normalized.join('-');

    case 'CONSTANT_CASE':
      return normalized.map((t) => t.toUpperCase()).join('_');

    case 'lower case':
      return normalized.join(' ');

    case 'UPPER CASE':
      return normalized.map((t) => t.toUpperCase()).join(' ');

    default:
      const _exhaustive: never = mode;
      return _exhaustive;
  }
}

function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str[0].toUpperCase() + str.slice(1);
}
