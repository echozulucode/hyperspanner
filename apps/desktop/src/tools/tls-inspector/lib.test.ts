import { describe, expect, it } from 'vitest';
import { parseEndpoint } from './lib';

describe('parseEndpoint', () => {
  it('returns null for empty input', () => {
    expect(parseEndpoint('')).toBeNull();
    expect(parseEndpoint('   ')).toBeNull();
  });

  it('defaults to port 443 when only a host is given', () => {
    expect(parseEndpoint('example.com')).toEqual({
      host: 'example.com',
      port: 443,
    });
  });

  it('parses host:port', () => {
    expect(parseEndpoint('example.com:8443')).toEqual({
      host: 'example.com',
      port: 8443,
    });
  });

  it('rejects out-of-range ports', () => {
    expect(parseEndpoint('example.com:0')).toBeNull();
    expect(parseEndpoint('example.com:99999')).toBeNull();
    expect(parseEndpoint('example.com:-1')).toBeNull();
  });

  it('rejects non-numeric ports', () => {
    expect(parseEndpoint('example.com:abc')).toBeNull();
  });

  it('parses bracketed IPv6 literals', () => {
    expect(parseEndpoint('[::1]:443')).toEqual({ host: '::1', port: 443 });
    expect(parseEndpoint('[2001:db8::1]:8443')).toEqual({
      host: '2001:db8::1',
      port: 8443,
    });
  });

  it('defaults port for bare bracketed IPv6 with no explicit port', () => {
    expect(parseEndpoint('[::1]')).toEqual({ host: '::1', port: 443 });
  });

  it('rejects unbracketed IPv6 with multiple colons', () => {
    // Ambiguous — could be `2001:db8::1` (host only, default port) or
    // `2001:db8::1:443` (host with port). The parser refuses the
    // ambiguity and asks the user to bracket their IPv6 literals.
    expect(parseEndpoint('2001:db8::1:443')).toBeNull();
  });

  it('rejects malformed bracketed inputs', () => {
    expect(parseEndpoint('[::1')).toBeNull(); // unclosed bracket
    expect(parseEndpoint('[::1]443')).toBeNull(); // missing colon after `]`
  });
});
