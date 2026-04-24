import { describe, expect, it } from 'vitest';

import { tokenize, transformCase } from './lib';

/**
 * Case Transform lib — pure-function tests.
 *
 * Focus areas:
 *   - Tokenization across various input shapes (camelCase, snake_case,
 *     kebab-case, PascalCase, acronyms, mixed with digits, spaces).
 *   - Each mode produces correct output for representative inputs.
 *   - Round-trip and consistency checks across modes.
 *   - Edge cases: empty string, whitespace-only, single character,
 *     pathological inputs (all punctuation, all digits, etc.).
 */

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('hello world')).toEqual(['hello', 'world']);
    expect(tokenize('a b c')).toEqual(['a', 'b', 'c']);
  });

  it('splits on underscores', () => {
    expect(tokenize('hello_world')).toEqual(['hello', 'world']);
    expect(tokenize('user_id_name')).toEqual(['user', 'id', 'name']);
  });

  it('splits on hyphens', () => {
    expect(tokenize('hello-world')).toEqual(['hello', 'world']);
    expect(tokenize('kebab-case-string')).toEqual(['kebab', 'case', 'string']);
  });

  it('splits on camelCase transitions', () => {
    expect(tokenize('helloWorld')).toEqual(['hello', 'World']);
    expect(tokenize('camelCaseString')).toEqual(['camel', 'Case', 'String']);
  });

  it('splits on PascalCase transitions', () => {
    expect(tokenize('HelloWorld')).toEqual(['Hello', 'World']);
  });

  it('handles acronyms (uppercase runs)', () => {
    expect(tokenize('HelloWORLDFoo')).toEqual(['Hello', 'WORLD', 'Foo']);
    expect(tokenize('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request']);
  });

  it('splits on digit boundaries', () => {
    expect(tokenize('user42')).toEqual(['user', '42']);
    expect(tokenize('a1b2c3')).toEqual(['a', '1', 'b', '2', 'c', '3']);
    expect(tokenize('user_id_42')).toEqual(['user', 'id', '42']);
  });

  it('handles mixed inputs', () => {
    expect(tokenize('get_HTTPSConnection_2')).toEqual([
      'get',
      'HTTPS',
      'Connection',
      '2',
    ]);
  });

  it('returns empty for blank input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
    expect(tokenize('\t\n')).toEqual([]);
  });

  it('handles single character', () => {
    expect(tokenize('a')).toEqual(['a']);
    expect(tokenize('A')).toEqual(['A']);
  });

  it('ignores leading/trailing whitespace and punctuation', () => {
    expect(tokenize('  hello world  ')).toEqual(['hello', 'world']);
    expect(tokenize('___hello___')).toEqual(['hello']);
    expect(tokenize('---hello---')).toEqual(['hello']);
  });

  it('handles consecutive punctuation as separators', () => {
    expect(tokenize('hello__world')).toEqual(['hello', 'world']);
    expect(tokenize('hello--world')).toEqual(['hello', 'world']);
  });

  it('handles all punctuation', () => {
    expect(tokenize('---')).toEqual([]);
    expect(tokenize('___')).toEqual([]);
    expect(tokenize('_ - _')).toEqual([]);
  });
});

describe('transformCase', () => {
  describe('camelCase', () => {
    it('converts snake_case to camelCase', () => {
      const r = transformCase('hello_world', 'camelCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('helloWorld');
    });

    it('converts PascalCase to camelCase', () => {
      const r = transformCase('HelloWorld', 'camelCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('helloWorld');
    });

    it('converts kebab-case to camelCase', () => {
      const r = transformCase('hello-world', 'camelCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('helloWorld');
    });

    it('converts space-separated to camelCase', () => {
      const r = transformCase('hello world', 'camelCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('helloWorld');
    });

    it('handles digits', () => {
      const r = transformCase('user_id_42', 'camelCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('userId42');
    });

    it('is idempotent', () => {
      const first = transformCase('helloWorld', 'camelCase');
      expect(first.kind).toBe('ok');
      if (first.kind === 'ok') {
        const again = transformCase(first.text, 'camelCase');
        expect(again.kind).toBe('ok');
        if (again.kind === 'ok') expect(again.text).toBe('helloWorld');
      }
    });
  });

  describe('PascalCase', () => {
    it('converts snake_case to PascalCase', () => {
      const r = transformCase('hello_world', 'PascalCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('HelloWorld');
    });

    it('converts camelCase to PascalCase', () => {
      const r = transformCase('helloWorld', 'PascalCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('HelloWorld');
    });

    it('is idempotent', () => {
      const first = transformCase('HelloWorld', 'PascalCase');
      expect(first.kind).toBe('ok');
      if (first.kind === 'ok') {
        const again = transformCase(first.text, 'PascalCase');
        expect(again.kind).toBe('ok');
        if (again.kind === 'ok') expect(again.text).toBe('HelloWorld');
      }
    });
  });

  describe('snake_case', () => {
    it('converts camelCase to snake_case', () => {
      const r = transformCase('helloWorld', 'snake_case');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello_world');
    });

    it('converts PascalCase to snake_case', () => {
      const r = transformCase('HelloWorld', 'snake_case');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello_world');
    });

    it('converts kebab-case to snake_case', () => {
      const r = transformCase('hello-world', 'snake_case');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello_world');
    });

    it('is idempotent', () => {
      const first = transformCase('hello_world', 'snake_case');
      expect(first.kind).toBe('ok');
      if (first.kind === 'ok') {
        const again = transformCase(first.text, 'snake_case');
        expect(again.kind).toBe('ok');
        if (again.kind === 'ok') expect(again.text).toBe('hello_world');
      }
    });
  });

  describe('kebab-case', () => {
    it('converts snake_case to kebab-case', () => {
      const r = transformCase('hello_world', 'kebab-case');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello-world');
    });

    it('converts camelCase to kebab-case', () => {
      const r = transformCase('helloWorld', 'kebab-case');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello-world');
    });

    it('is idempotent', () => {
      const first = transformCase('hello-world', 'kebab-case');
      expect(first.kind).toBe('ok');
      if (first.kind === 'ok') {
        const again = transformCase(first.text, 'kebab-case');
        expect(again.kind).toBe('ok');
        if (again.kind === 'ok') expect(again.text).toBe('hello-world');
      }
    });
  });

  describe('CONSTANT_CASE', () => {
    it('converts camelCase to CONSTANT_CASE', () => {
      const r = transformCase('helloWorld', 'CONSTANT_CASE');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('HELLO_WORLD');
    });

    it('converts snake_case to CONSTANT_CASE', () => {
      const r = transformCase('hello_world', 'CONSTANT_CASE');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('HELLO_WORLD');
    });

    it('is idempotent', () => {
      const first = transformCase('HELLO_WORLD', 'CONSTANT_CASE');
      expect(first.kind).toBe('ok');
      if (first.kind === 'ok') {
        const again = transformCase(first.text, 'CONSTANT_CASE');
        expect(again.kind).toBe('ok');
        if (again.kind === 'ok') expect(again.text).toBe('HELLO_WORLD');
      }
    });
  });

  describe('lower case', () => {
    it('converts camelCase to lower case', () => {
      const r = transformCase('helloWorld', 'lower case');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello world');
    });

    it('converts PascalCase to lower case', () => {
      const r = transformCase('HelloWorld', 'lower case');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('hello world');
    });

    it('is idempotent', () => {
      const first = transformCase('hello world', 'lower case');
      expect(first.kind).toBe('ok');
      if (first.kind === 'ok') {
        const again = transformCase(first.text, 'lower case');
        expect(again.kind).toBe('ok');
        if (again.kind === 'ok') expect(again.text).toBe('hello world');
      }
    });
  });

  describe('UPPER CASE', () => {
    it('converts camelCase to UPPER CASE', () => {
      const r = transformCase('helloWorld', 'UPPER CASE');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('HELLO WORLD');
    });

    it('converts snake_case to UPPER CASE', () => {
      const r = transformCase('hello_world', 'UPPER CASE');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('HELLO WORLD');
    });

    it('is idempotent', () => {
      const first = transformCase('HELLO WORLD', 'UPPER CASE');
      expect(first.kind).toBe('ok');
      if (first.kind === 'ok') {
        const again = transformCase(first.text, 'UPPER CASE');
        expect(again.kind).toBe('ok');
        if (again.kind === 'ok') expect(again.text).toBe('HELLO WORLD');
      }
    });
  });

  describe('edge cases', () => {
    it('returns empty for blank input', () => {
      expect(transformCase('', 'camelCase').kind).toBe('empty');
      expect(transformCase('   ', 'camelCase').kind).toBe('empty');
      expect(transformCase('\t\n', 'camelCase').kind).toBe('empty');
    });

    it('handles single character', () => {
      const r = transformCase('a', 'camelCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('a');
    });

    it('handles all-punctuation input', () => {
      expect(transformCase('---', 'camelCase').kind).toBe('empty');
      expect(transformCase('___', 'camelCase').kind).toBe('empty');
    });

    it('handles acronyms consistently', () => {
      const input = 'HelloWORLDFoo';
      const camel = transformCase(input, 'camelCase');
      const pascal = transformCase(input, 'PascalCase');
      const snake = transformCase(input, 'snake_case');
      expect(camel.kind).toBe('ok');
      expect(pascal.kind).toBe('ok');
      expect(snake.kind).toBe('ok');
      if (camel.kind === 'ok' && pascal.kind === 'ok' && snake.kind === 'ok') {
        expect(camel.text).toBe('helloWorldFoo');
        expect(pascal.text).toBe('HelloWorldFoo');
        expect(snake.text).toBe('hello_world_foo');
      }
    });

    it('handles digit-prefixed identifiers', () => {
      const r = transformCase('123_hello', 'camelCase');
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.text).toBe('123hello');
    });

    it('round-trips through multiple modes', () => {
      const original = 'hello_world';
      const camel = transformCase(original, 'camelCase');
      expect(camel.kind).toBe('ok');
      if (camel.kind === 'ok') {
        const backToSnake = transformCase(camel.text, 'snake_case');
        expect(backToSnake.kind).toBe('ok');
        if (backToSnake.kind === 'ok') {
          expect(backToSnake.text).toBe('hello_world');
        }
      }
    });
  });
});
