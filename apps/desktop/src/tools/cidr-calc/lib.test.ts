import { describe, expect, it } from 'vitest';

import { isInCidr, parseCidr } from './lib';

/**
 * CIDR Calculator lib — pure-function tests.
 *
 * Focus areas:
 *   - IPv4 happy paths (common prefixes, edge cases).
 *   - IPv6 basic parsing and compression.
 *   - Error handling for invalid input.
 *   - Membership tests (in / out).
 *   - RFC1918 private ranges, special addresses.
 */

describe('parseCidr IPv4', () => {
  it('parses a common IPv4 CIDR', () => {
    const r = parseCidr('10.0.0.0/24');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.info.kind).toBe('ipv4');
      if (r.info.kind === 'ipv4') {
        expect(r.info.networkAddress).toBe('10.0.0.0');
        expect(r.info.broadcastAddress).toBe('10.0.0.255');
        expect(r.info.firstHost).toBe('10.0.0.1');
        expect(r.info.lastHost).toBe('10.0.0.254');
        expect(r.info.prefixLength).toBe('/24');
        expect(r.info.totalAddresses).toBe('256');
        expect(r.info.usableHosts).toBe('254');
      }
    }
  });

  it('parses RFC1918 private ranges', () => {
    const r1 = parseCidr('10.0.0.0/8');
    expect(r1.kind).toBe('ok');
    if (r1.kind === 'ok' && r1.info.kind === 'ipv4') {
      expect(r1.info.flags).toContain('Private (RFC1918)');
    }

    const r2 = parseCidr('172.16.0.0/12');
    expect(r2.kind).toBe('ok');
    if (r2.kind === 'ok' && r2.info.kind === 'ipv4') {
      expect(r2.info.flags).toContain('Private (RFC1918)');
    }

    const r3 = parseCidr('192.168.0.0/16');
    expect(r3.kind).toBe('ok');
    if (r3.kind === 'ok' && r3.info.kind === 'ipv4') {
      expect(r3.info.flags).toContain('Private (RFC1918)');
    }
  });

  it('parses loopback', () => {
    const r = parseCidr('127.0.0.1/32');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv4') {
      expect(r.info.flags).toContain('Loopback');
    }
  });

  it('parses link-local', () => {
    const r = parseCidr('169.254.0.0/16');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv4') {
      expect(r.info.flags).toContain('Link-local');
    }
  });

  it('parses multicast', () => {
    const r = parseCidr('224.0.0.0/4');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv4') {
      expect(r.info.flags).toContain('Multicast');
    }
  });

  it('handles /31 (point-to-point)', () => {
    const r = parseCidr('10.0.0.0/31');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv4') {
      expect(r.info.totalAddresses).toBe('2');
      expect(r.info.usableHosts).toBe('2');
      expect(r.info.firstHost).toBe('10.0.0.0');
      expect(r.info.lastHost).toBe('10.0.0.1');
    }
  });

  it('handles /32 (single host)', () => {
    const r = parseCidr('192.168.1.1/32');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv4') {
      expect(r.info.totalAddresses).toBe('1');
      expect(r.info.usableHosts).toBe('1');
      expect(r.info.networkAddress).toBe('192.168.1.1');
      expect(r.info.broadcastAddress).toBe('192.168.1.1');
    }
  });

  it('handles /0 (entire Internet)', () => {
    const r = parseCidr('0.0.0.0/0');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv4') {
      expect(r.info.networkAddress).toBe('0.0.0.0');
      expect(r.info.prefixLength).toBe('/0');
      expect(r.info.totalAddresses).toBe('4294967296');
    }
  });

  it('rejects invalid octet', () => {
    const r = parseCidr('256.0.0.0/24');
    expect(r.kind).toBe('error');
  });

  it('rejects missing slash', () => {
    const r = parseCidr('10.0.0.0');
    expect(r.kind).toBe('error');
  });

  it('rejects non-numeric prefix', () => {
    const r = parseCidr('10.0.0.0/abc');
    expect(r.kind).toBe('error');
  });

  it('rejects prefix > 32 for IPv4', () => {
    const r = parseCidr('10.0.0.0/33');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.message).toMatch(/prefix.*0–32/i);
  });

  it('rejects too many segments', () => {
    const r = parseCidr('10.0.0.0.0/24');
    expect(r.kind).toBe('error');
  });

  it('returns empty for blank input', () => {
    expect(parseCidr('').kind).toBe('empty');
    expect(parseCidr('   ').kind).toBe('empty');
  });
});

describe('parseCidr IPv6', () => {
  it('parses IPv6 documentation range', () => {
    const r = parseCidr('2001:db8::/32');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv6') {
      expect(r.info.flags).toContain('Documentation');
      expect(r.info.prefixLength).toBe('/32');
    }
  });

  it('parses link-local', () => {
    const r = parseCidr('fe80::/10');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv6') {
      expect(r.info.flags).toContain('Link-local');
    }
  });

  it('parses loopback', () => {
    const r = parseCidr('::1/128');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv6') {
      expect(r.info.flags).toContain('Loopback');
    }
  });

  it('parses unique-local', () => {
    const r = parseCidr('fc00::/7');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv6') {
      expect(r.info.flags).toContain('Unique-local');
    }
  });

  it('parses multicast', () => {
    const r = parseCidr('ff02::1/128');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv6') {
      expect(r.info.flags).toContain('Multicast');
    }
  });

  it('parses ::/0', () => {
    const r = parseCidr('::/0');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok' && r.info.kind === 'ipv6') {
      expect(r.info.prefixLength).toBe('/0');
    }
  });

  it('rejects prefix > 128', () => {
    const r = parseCidr('2001:db8::/129');
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.message).toMatch(/prefix.*0–128/i);
  });
});

describe('isInCidr IPv4', () => {
  it('matches an address in the network', () => {
    const parsed = parseCidr('10.0.0.0/24');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      const result = isInCidr('10.0.0.50', parsed.info);
      expect(result.kind).toBe('in');
    }
  });

  it('rejects an address outside the network', () => {
    const parsed = parseCidr('10.0.0.0/24');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      const result = isInCidr('10.0.1.50', parsed.info);
      expect(result.kind).toBe('out');
    }
  });

  it('matches network address itself', () => {
    const parsed = parseCidr('10.0.0.0/24');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      const result = isInCidr('10.0.0.0', parsed.info);
      expect(result.kind).toBe('in');
    }
  });

  it('matches broadcast address', () => {
    const parsed = parseCidr('10.0.0.0/24');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      const result = isInCidr('10.0.0.255', parsed.info);
      expect(result.kind).toBe('in');
    }
  });

  it('rejects invalid IP on membership test', () => {
    const parsed = parseCidr('10.0.0.0/24');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      const result = isInCidr('invalid', parsed.info);
      expect(result.kind).toBe('error');
    }
  });
});

describe('isInCidr IPv6', () => {
  it('matches an address in the documentation range', () => {
    const parsed = parseCidr('2001:db8::/32');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      const result = isInCidr('2001:db8::1', parsed.info);
      expect(result.kind).toBe('in');
    }
  });

  it('rejects an address outside the range', () => {
    const parsed = parseCidr('2001:db8::/32');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      const result = isInCidr('2001:db9::1', parsed.info);
      expect(result.kind).toBe('out');
    }
  });

  it('rejects invalid IPv6 on membership test', () => {
    const parsed = parseCidr('2001:db8::/32');
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      const result = isInCidr('not-ipv6', parsed.info);
      expect(result.kind).toBe('error');
    }
  });
});
