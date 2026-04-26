/**
 * TLS Inspector — typed mirror of `crate::commands::tls`.
 *
 * Connects to a host:port, performs a TLS handshake, and surfaces the
 * negotiated protocol version, cipher suite, and parsed certificate
 * chain. The Rust side falls back to a permissive verifier when the
 * standard one rejects the chain (self-signed labs, expired certs,
 * etc.) so the inspector can still show the user what the server
 * presented; `trusted` carries the distinction.
 */

import { invoke } from './invoke';

export interface TlsCert {
  /** Distinguished Name of the cert subject. */
  subject: string;
  /** Distinguished Name of the issuer. */
  issuer: string;
  /** ISO-ish timestamp formatted by `x509-parser`. Present as a string
   *  so the JS side doesn't have to translate seconds-since-epoch. */
  notBefore: string;
  notAfter: string;
  serialNumber: string;
  signatureAlgorithm: string;
  /** Subject Alternative Names — DNS names, IP addresses, etc. Present
   *  as the `Debug` string of `general_names` from x509-parser; the UI
   *  treats them as opaque labels. */
  subjectAltNames: string[];
}

export interface TlsInspectResult {
  /** Negotiated TLS version, e.g. `"TLSv1_3"` or `"TLSv1_2"`. */
  protocolVersion: string;
  /** Negotiated cipher suite, e.g. `"TLS13_AES_128_GCM_SHA256"`. */
  cipherSuite: string;
  /** Server cert first, then intermediates. The root is usually omitted
   *  by the server and not included here. */
  certChain: TlsCert[];
  /** `true` if the chain was accepted by the standard webpki-roots
   *  verifier; `false` if the connection used the permissive fallback
   *  (self-signed / private CA / expired). The UI surfaces both. */
  trusted: boolean;
}

export interface TlsInspectOptions {
  host: string;
  port: number;
  /** Override the default 8 second connect+handshake timeout. */
  timeoutMs?: number;
}

export function tlsInspect(opts: TlsInspectOptions): Promise<TlsInspectResult> {
  return invoke<TlsInspectResult>('tls_inspect', {
    host: opts.host,
    port: opts.port,
    timeoutMs: opts.timeoutMs,
  });
}
