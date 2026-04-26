/**
 * IPC-safe error taxonomy — TS mirror of Rust's `HyperspannerError`.
 *
 * The Rust side (apps/desktop/src-tauri/src/error.rs) serializes every
 * command failure as a flat `{ kind, message }` object. We rehydrate that
 * into a `HyperspannerError` instance here so UI code can pattern-match on
 * `.kind` (a string literal union) rather than string-parsing `.message`.
 *
 * The union below MUST stay in sync with the Rust `HyperspannerError::kind`
 * match — adding a new Rust variant without updating this file degrades to
 * the `unknown` kind, which still renders the message but loses the typed
 * switch exhaustiveness check.
 *
 * Design choice: we expose a single class with a discriminated `kind` field
 * rather than a class-per-variant hierarchy. Rationale — error handling at
 * the call site is usually a switch over `kind`, not method dispatch, and
 * a single class plays well with `instanceof` checks in generic code
 * (React error boundaries, Promise `.catch`, Vitest matchers).
 */

/**
 * Machine-readable error tags. Each value mirrors a variant in the Rust
 * `HyperspannerError` enum. The `unknown` kind is a client-side-only
 * fallback for payloads the Rust side never emits (e.g. a network transport
 * failure, a shape mismatch) — it lets callers handle "something went wrong
 * but we don't know what" without a separate exception type.
 */
export type HyperspannerErrorKind =
  | 'io'
  | 'path_not_found'
  | 'not_a_file'
  | 'file_too_large'
  | 'invalid_encoding'
  | 'invalid_utf8'
  | 'unsupported_algorithm'
  | 'malformed_protobuf'
  | 'invalid_hex'
  | 'network_error'
  | 'tls_handshake_failed'
  | 'certificate_parse_failed'
  | 'invalid_endpoint'
  | 'unknown';

/**
 * Shape of the `{ kind, message }` payload Rust serializes. Narrower than
 * `unknown` at use sites but still loose — the `kind` string is checked at
 * runtime against the known union before it's trusted as a literal.
 */
interface HyperspannerErrorPayload {
  kind: string;
  message: string;
}

const KNOWN_KINDS: ReadonlySet<HyperspannerErrorKind> = new Set([
  'io',
  'path_not_found',
  'not_a_file',
  'file_too_large',
  'invalid_encoding',
  'invalid_utf8',
  'unsupported_algorithm',
  'malformed_protobuf',
  'invalid_hex',
  'network_error',
  'tls_handshake_failed',
  'certificate_parse_failed',
  'invalid_endpoint',
  'unknown',
]);

/**
 * Typed wrapper around an IPC failure. Thrown by `invoke()` (see
 * `./invoke.ts`) so command callers can write:
 *
 *   try {
 *     await readTextFile({ path });
 *   } catch (err) {
 *     if (err instanceof HyperspannerError && err.kind === 'path_not_found') {
 *       // show "file not found" UI
 *     }
 *   }
 */
export class HyperspannerError extends Error {
  public readonly kind: HyperspannerErrorKind;

  constructor(kind: HyperspannerErrorKind, message: string) {
    super(message);
    this.name = 'HyperspannerError';
    this.kind = kind;
    // Preserve prototype chain across the `extends Error` + transpile
    // boundary — without this, `instanceof HyperspannerError` is false in
    // some older runtimes. Cheap insurance; the Tauri WebView is modern
    // enough not to need it, but it costs nothing and helps in tests that
    // run under Node's older error semantics.
    Object.setPrototypeOf(this, HyperspannerError.prototype);
  }
}

/**
 * True if `value` has the `{ kind, message }` shape Rust sends over IPC.
 * Does not assert that `kind` is a known value — that's the caller's job
 * via `toHyperspannerError`.
 */
function isErrorPayload(value: unknown): value is HyperspannerErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'message' in value &&
    typeof (value as { kind: unknown }).kind === 'string' &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/**
 * Convert whatever `@tauri-apps/api`'s `invoke` rejects with into a typed
 * `HyperspannerError`. Tauri rejects with either:
 *   - a string (for invoke-layer failures, e.g. no such command)
 *   - the serialized error payload (for command-layer failures)
 *   - rarely, an Error already
 *
 * Unknown payloads collapse to `kind: 'unknown'` with the original value
 * stringified into `message`. Callers should still handle `unknown` for
 * completeness but will hit it rarely.
 */
export function toHyperspannerError(raw: unknown): HyperspannerError {
  if (raw instanceof HyperspannerError) {
    return raw;
  }

  if (isErrorPayload(raw)) {
    const kind = KNOWN_KINDS.has(raw.kind as HyperspannerErrorKind)
      ? (raw.kind as HyperspannerErrorKind)
      : 'unknown';
    return new HyperspannerError(kind, raw.message);
  }

  if (typeof raw === 'string') {
    return new HyperspannerError('unknown', raw);
  }

  if (raw instanceof Error) {
    return new HyperspannerError('unknown', raw.message);
  }

  // Last resort — stringify and keep going. Prevents `catch` blocks
  // anywhere upstream from receiving a bare `unknown`.
  let message: string;
  try {
    message = JSON.stringify(raw);
  } catch {
    message = String(raw);
  }
  return new HyperspannerError('unknown', message);
}
