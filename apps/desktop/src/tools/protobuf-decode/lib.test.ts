import { describe, expect, it } from 'vitest';
import { countFields, summarizeValue } from './lib';
import type { WireField, WireValue } from './lib';

describe('countFields', () => {
  it('counts a flat list', () => {
    const fields: WireField[] = [
      {
        field: 1,
        wireType: 0,
        wireTypeLabel: 'varint',
        value: { kind: 'varint', uint: '1', int: '1' },
      },
      {
        field: 2,
        wireType: 0,
        wireTypeLabel: 'varint',
        value: { kind: 'varint', uint: '2', int: '2' },
      },
    ];
    expect(countFields(fields)).toBe(2);
  });

  it('recurses into nested messages', () => {
    const fields: WireField[] = [
      {
        field: 1,
        wireType: 2,
        wireTypeLabel: 'length-delimited',
        value: {
          kind: 'message',
          fields: [
            {
              field: 1,
              wireType: 0,
              wireTypeLabel: 'varint',
              value: { kind: 'varint', uint: '7', int: '7' },
            },
            {
              field: 2,
              wireType: 0,
              wireTypeLabel: 'varint',
              value: { kind: 'varint', uint: '8', int: '8' },
            },
          ],
        },
      },
    ];
    // 1 outer + 2 inner = 3 total
    expect(countFields(fields)).toBe(3);
  });
});

describe('summarizeValue', () => {
  it('summarizes a varint with matching uint/int', () => {
    const value: WireValue = { kind: 'varint', uint: '42', int: '42' };
    expect(summarizeValue(value)).toBe('varint 42');
  });

  it('shows signed reinterpretation when uint and int differ', () => {
    const value: WireValue = {
      kind: 'varint',
      uint: '18446744073709551615',
      int: '-1',
    };
    expect(summarizeValue(value)).toBe(
      'varint 18446744073709551615 (signed -1)',
    );
  });

  it('summarizes a string', () => {
    const value: WireValue = { kind: 'string', value: 'hello' };
    expect(summarizeValue(value)).toBe('string · hello');
  });

  it('truncates long strings', () => {
    const value: WireValue = { kind: 'string', value: 'a'.repeat(100) };
    const s = summarizeValue(value);
    expect(s.length).toBeLessThanOrEqual('string · '.length + 60);
    expect(s).toContain('…');
  });

  it('summarizes a nested message with a count', () => {
    const value: WireValue = {
      kind: 'message',
      fields: [
        {
          field: 1,
          wireType: 0,
          wireTypeLabel: 'varint',
          value: { kind: 'varint', uint: '1', int: '1' },
        },
      ],
    };
    expect(summarizeValue(value)).toBe('message · 1 field');
  });

  it('summarizes bytes with hex preview', () => {
    const value: WireValue = { kind: 'bytes', hex: 'ff00aa', len: 3 };
    expect(summarizeValue(value)).toContain('3 bytes');
    expect(summarizeValue(value)).toContain('ff00aa');
  });

  it('summarizes fixed32 with all three views', () => {
    const value: WireValue = {
      kind: 'fixed32',
      uint: 0x40400000,
      int: 0x40400000,
      float: 3,
    };
    const s = summarizeValue(value);
    expect(s).toContain('fixed32');
    expect(s).toContain('3');
  });
});
