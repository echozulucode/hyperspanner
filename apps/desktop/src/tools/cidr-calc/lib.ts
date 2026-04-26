/**
 * Pure CIDR calculation for the CIDR Calculator tool.
 *
 * This module is deliberately free of React, Tauri, or store imports so it
 * stays trivially unit-testable and can be reused by a potential future
 * backend-accelerated path.
 *
 * All entry points return a discriminated union rather than throwing.
 */

export interface CidrInfoIPv4 {
  kind: 'ipv4';
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  subnetMask: string;
  wildcardMask: string;
  prefixLength: string;
  totalAddresses: string;
  usableHosts: string;
  addressClass: string;
  flags: string[];
}

export interface CidrInfoIPv6 {
  kind: 'ipv6';
  networkAddress: string;
  prefixLength: string;
  totalAddresses: string;
  flags: string[];
}

export type CidrInfo = CidrInfoIPv4 | CidrInfoIPv6;

export interface CidrParseOk {
  kind: 'ok';
  info: CidrInfo;
}

export interface CidrParseError {
  kind: 'error';
  message: string;
}

export interface CidrParseEmpty {
  kind: 'empty';
}

export type CidrParseResult = CidrParseOk | CidrParseError | CidrParseEmpty;

export interface MembershipIn {
  kind: 'in';
  normalized: string;
}

export interface MembershipOut {
  kind: 'out';
  normalized: string;
}

export interface MembershipError {
  kind: 'error';
  message: string;
}

export type MembershipResult = MembershipIn | MembershipOut | MembershipError;

/**
 * Parse a CIDR string like "10.0.0.0/24" or "2001:db8::/32".
 */
export function parseCidr(input: string): CidrParseResult {
  if (input.trim().length === 0) {
    return { kind: 'empty' };
  }

  const match = input.trim().match(/^([^/]+)\/(\d+)$/);
  if (!match) {
    return { kind: 'error', message: 'Invalid CIDR format. Use "address/prefix".' };
  }

  const [, addressStr, prefixStr] = match;
  const prefix = Number(prefixStr);

  if (!Number.isInteger(prefix) || prefix < 0) {
    return { kind: 'error', message: 'Prefix must be a non-negative integer.' };
  }

  // Try IPv4 first
  if (isValidIPv4(addressStr)) {
    if (prefix > 32) {
      return { kind: 'error', message: 'IPv4 prefix must be 0–32.' };
    }
    try {
      const info = parseIPv4Cidr(addressStr, prefix);
      return { kind: 'ok', info };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid IPv4 address.';
      return { kind: 'error', message };
    }
  }

  // Try IPv6
  if (isValidIPv6(addressStr)) {
    if (prefix > 128) {
      return { kind: 'error', message: 'IPv6 prefix must be 0–128.' };
    }
    try {
      const info = parseIPv6Cidr(addressStr, prefix);
      return { kind: 'ok', info };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid IPv6 address.';
      return { kind: 'error', message };
    }
  }

  return { kind: 'error', message: 'Invalid IPv4 or IPv6 address format.' };
}

/**
 * Test whether an IP is in the given CIDR block.
 */
export function isInCidr(ipText: string, info: CidrInfo): MembershipResult {
  try {
    if (info.kind === 'ipv4') {
      if (!isValidIPv4(ipText)) {
        return { kind: 'error', message: 'Invalid IPv4 address.' };
      }
      const ipNum = ipv4ToUint32(ipText);
      const networkNum = ipv4ToUint32(info.networkAddress);
      // `prefixLength` is stored as `"/24"` for display — strip the
      // leading slash before `Number(...)` or you get NaN, which the
      // shift coerces to 0, producing an all-ones mask and the subnet
      // becomes "exact-address-match only".
      const prefixLen = parsePrefixLength(info.prefixLength);
      const mask = prefixLen === 0 ? 0 : (0xffffffff << (32 - prefixLen)) >>> 0;
      const inSubnet = (ipNum & mask) === (networkNum & mask);
      return {
        kind: inSubnet ? 'in' : 'out',
        normalized: ipText,
      };
    } else {
      if (!isValidIPv6(ipText)) {
        return { kind: 'error', message: 'Invalid IPv6 address.' };
      }
      const ipBig = ipv6ToBigint(ipText);
      const networkBig = ipv6ToBigint(info.networkAddress);
      const prefixLen = parsePrefixLength(info.prefixLength);
      const mask =
        prefixLen === 0 ? 0n : (0xffffffffffffffffffffffffffffffffn << BigInt(128 - prefixLen)) & 0xffffffffffffffffffffffffffffffffn;
      const inSubnet = (ipBig & mask) === (networkBig & mask);
      const normalized = bigintToIpv6(ipBig);
      return {
        kind: inSubnet ? 'in' : 'out',
        normalized,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid address.';
    return { kind: 'error', message };
  }
}

// ----- IPv4 helpers -----

function isValidIPv4(addr: string): boolean {
  const parts = addr.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

/** Strip the leading `/` from a stored prefix-length string (`"/24"` →
 *  `24`). Used by `isInCidr` so the bitmask math doesn't get NaN. */
function parsePrefixLength(stored: string): number {
  return Number(stored.replace(/^\//, ''));
}

function ipv4ToUint32(addr: string): number {
  const parts = addr.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function uint32ToIpv4(num: number): string {
  num = num >>> 0;
  return `${(num >>> 24) & 0xff}.${(num >>> 16) & 0xff}.${(num >>> 8) & 0xff}.${num & 0xff}`;
}

function parseIPv4Cidr(addressStr: string, prefixLen: number): CidrInfoIPv4 {
  const ipNum = ipv4ToUint32(addressStr);
  const mask = prefixLen === 0 ? 0 : (0xffffffff << (32 - prefixLen)) >>> 0;
  const networkNum = ipNum & mask;
  const broadcastNum = networkNum | (~mask >>> 0);

  let firstHost: number;
  let lastHost: number;
  if (prefixLen === 31) {
    firstHost = networkNum;
    lastHost = broadcastNum;
  } else if (prefixLen === 32) {
    firstHost = networkNum;
    lastHost = networkNum;
  } else {
    firstHost = networkNum + 1;
    lastHost = broadcastNum - 1;
  }

  const totalAddresses = prefixLen === 0 ? '4294967296' : String(2 ** (32 - prefixLen));
  let usableHosts: string;
  if (prefixLen === 31) {
    usableHosts = '2';
  } else if (prefixLen === 32) {
    usableHosts = '1';
  } else {
    const total = Number(totalAddresses);
    usableHosts = String(total - 2);
  }

  const wildcardNum = ~mask >>> 0;

  const addressClass = getIPv4Class(ipNum);
  const flags = getIPv4Flags(ipNum);

  return {
    kind: 'ipv4',
    networkAddress: uint32ToIpv4(networkNum),
    broadcastAddress: uint32ToIpv4(broadcastNum),
    firstHost: uint32ToIpv4(firstHost),
    lastHost: uint32ToIpv4(lastHost),
    subnetMask: uint32ToIpv4(mask),
    wildcardMask: uint32ToIpv4(wildcardNum),
    prefixLength: `/${prefixLen}`,
    totalAddresses,
    usableHosts,
    addressClass,
    flags,
  };
}

function getIPv4Class(ipNum: number): string {
  const firstOctet = (ipNum >>> 24) & 0xff;
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D';
  return 'E';
}

function getIPv4Flags(ipNum: number): string[] {
  const flags: string[] = [];
  const firstOctet = (ipNum >>> 24) & 0xff;

  // RFC1918 private ranges
  if (firstOctet === 10 || firstOctet === 172 || firstOctet === 192) {
    const secondOctet = (ipNum >>> 16) & 0xff;
    if (firstOctet === 10) flags.push('Private (RFC1918)');
    else if (firstOctet === 172 && secondOctet >= 16 && secondOctet < 32) flags.push('Private (RFC1918)');
    else if (firstOctet === 192 && secondOctet === 168) flags.push('Private (RFC1918)');
  }

  if (firstOctet === 127) flags.push('Loopback');
  if (firstOctet === 169 && ((ipNum >>> 16) & 0xff) === 254) flags.push('Link-local');
  if (firstOctet >= 224 && firstOctet < 240) flags.push('Multicast');
  if (firstOctet >= 240) flags.push('Reserved');

  return flags;
}

// ----- IPv6 helpers -----

function isValidIPv6(addr: string): boolean {
  // Very basic check: should contain colons and valid hex chars
  if (!/^[0-9a-fA-F:]*$/.test(addr)) return false;
  // Attempt to parse
  try {
    ipv6ToBigint(addr);
    return true;
  } catch {
    return false;
  }
}

function ipv6ToBigint(addr: string): bigint {
  // Expand :: notation
  let expanded = addr;
  if (addr.includes('::')) {
    const [left, right] = addr.split('::');
    const leftGroups = left ? left.split(':') : [];
    const rightGroups = right ? right.split(':') : [];
    const missing = 8 - leftGroups.length - rightGroups.length;
    if (missing < 0) throw new Error('Invalid IPv6: too many groups');
    const zeros = Array(missing).fill('0');
    expanded = [...leftGroups, ...zeros, ...rightGroups].join(':');
  }

  const groups = expanded.split(':');
  if (groups.length !== 8) throw new Error('Invalid IPv6: wrong group count');

  let result = 0n;
  for (const group of groups) {
    const val = BigInt(parseInt(group || '0', 16));
    if (val < 0n || val > 0xffffn) throw new Error('Invalid IPv6 group');
    result = (result << 16n) | val;
  }
  return result;
}

function bigintToIpv6(num: bigint): string {
  const groups: string[] = [];
  let val = num;
  for (let i = 0; i < 8; i++) {
    // `val & 0xffffn` is already non-negative so we don't need the >>> 0
    // coerce-to-unsigned trick here (BigInt doesn't support >>> anyway).
    groups.unshift((val & 0xffffn).toString(16));
    val = val >> 16n;
  }
  // Compress longest run of zeros
  let compressed = groups.join(':');
  compressed = compressed.replace(/0:0:0:0:0:0:0:0/, '::');
  compressed = compressed.replace(/0:0:0:0:0:0:0/, '::');
  compressed = compressed.replace(/0:0:0:0:0:0/, '::');
  compressed = compressed.replace(/0:0:0:0:0/, '::');
  compressed = compressed.replace(/0:0:0:0/, '::');
  compressed = compressed.replace(/0:0:0/, '::');
  compressed = compressed.replace(/0:0/, '::');
  // Prevent multiple :: in one address
  if ((compressed.match(/::/g) || []).length > 1) {
    compressed = groups.join(':');
  }
  return compressed;
}

function parseIPv6Cidr(addressStr: string, prefixLen: number): CidrInfoIPv6 {
  const ipBig = ipv6ToBigint(addressStr);
  const mask = prefixLen === 0 ? 0n : (0xffffffffffffffffffffffffffffffffn << BigInt(128 - prefixLen)) & 0xffffffffffffffffffffffffffffffffn;
  const networkBig = ipBig & mask;

  const totalAddresses = `2^${128 - prefixLen}`;
  const flags = getIPv6Flags(ipBig);

  return {
    kind: 'ipv6',
    networkAddress: bigintToIpv6(networkBig),
    prefixLength: `/${prefixLen}`,
    totalAddresses,
    flags,
  };
}

function getIPv6Flags(ipBig: bigint): string[] {
  const flags: string[] = [];

  // All masks below are full 128-bit BigInts (32 hex digits). The
  // earlier version of this function used 64-bit literals for some,
  // which masked only the LOW half of the address — every prefix
  // comparison silently failed because IPv6 prefixes live in the
  // HIGH half. Documentation also had a one-digit-short literal
  // (31 hex digits → 124-bit value) that shifted the whole byte
  // pattern by one nibble. Net effect: every classification flag
  // returned empty for valid prefixes.

  // Link-local: fe80::/10 — upper 10 bits = 1111_1110_10
  const linkLocalMask = 0xffc00000000000000000000000000000n;
  const linkLocalPrefix = 0xfe800000000000000000000000000000n;
  if ((ipBig & linkLocalMask) === linkLocalPrefix) flags.push('Link-local');

  // Unique-local: fc00::/7 — upper 7 bits = 1111_110
  const ulMask = 0xfe000000000000000000000000000000n;
  const ulPrefix = 0xfc000000000000000000000000000000n;
  if ((ipBig & ulMask) === ulPrefix) flags.push('Unique-local');

  // Loopback: ::1 (the entire address is exactly 1)
  if (ipBig === 1n) flags.push('Loopback');

  // Multicast: ff00::/8 — upper 8 bits = 1111_1111
  const mcMask = 0xff000000000000000000000000000000n;
  const mcPrefix = 0xff000000000000000000000000000000n;
  if ((ipBig & mcMask) === mcPrefix) flags.push('Multicast');

  // Documentation: 2001:db8::/32 — upper 32 bits = 2001_0db8
  const docMask = 0xffffffff000000000000000000000000n;
  const docPrefix = 0x20010db8000000000000000000000000n;
  if ((ipBig & docMask) === docPrefix) flags.push('Documentation');

  return flags;
}
