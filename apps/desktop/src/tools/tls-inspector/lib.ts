/**
 * Pure helpers for the TLS Inspector tool. The TS-side state shape lives
 * here; type re-exports route through `@/ipc/tls`.
 */

export type { TlsCert, TlsInspectResult } from '../../ipc/tls';

import type { TlsInspectResult } from '../../ipc/tls';

export interface TlsInspectorState {
  /** Host as typed by the user. May contain `host:port` or just `host`. */
  endpoint: string;
  /** Last successful inspection result. Null before the first run or
   *  after a clear. */
  result: TlsInspectResult | null;
  /** True while a connection / handshake is in flight. */
  loading: boolean;
  /** Most recent error, or null on success. */
  error: { kind: string; message: string } | null;
}

export const DEFAULT_TLS_INSPECTOR_STATE: TlsInspectorState = {
  endpoint: '',
  result: null,
  loading: false,
  error: null,
};

/**
 * Parse a "host:port" or "host" string into a `{host, port}` pair.
 * Defaults to `443` when no explicit port is provided. Returns null
 * for malformed input — the component treats null as a validation
 * error before fetching.
 */
export function parseEndpoint(
  raw: string,
): { host: string; port: number } | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // IPv6 literals: [::1]:443
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    if (end === -1) return null;
    const host = trimmed.slice(1, end);
    const after = trimmed.slice(end + 1);
    if (after.length === 0) return { host, port: 443 };
    if (!after.startsWith(':')) return null;
    const port = Number.parseInt(after.slice(1), 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
    return { host, port };
  }

  // Plain host or host:port.
  const colonCount = (trimmed.match(/:/g) ?? []).length;
  if (colonCount === 0) {
    return { host: trimmed, port: 443 };
  }
  if (colonCount === 1) {
    const idx = trimmed.indexOf(':');
    const host = trimmed.slice(0, idx);
    const portStr = trimmed.slice(idx + 1);
    if (host.length === 0) return null;
    const port = Number.parseInt(portStr, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
    return { host, port };
  }

  // More than one colon and not a bracketed IPv6 — likely malformed.
  return null;
}
