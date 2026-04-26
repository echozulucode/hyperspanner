import { useCallback } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import { tlsInspect, toHyperspannerError } from '../../ipc';
import {
  DEFAULT_TLS_INSPECTOR_STATE,
  parseEndpoint,
  type TlsInspectorState,
  type TlsCert,
} from './lib';
import styles from './TlsInspector.module.css';

export interface TlsInspectorProps {
  toolId: string;
  zone?: Zone;
}

/**
 * TLS Inspector — connect to a `host:port` and render the negotiated
 * protocol version, cipher suite, and full certificate chain.
 *
 * Backed by `rustls` on the Rust side. If the standard webpki-roots
 * verifier rejects the chain, the backend retries with a permissive
 * verifier and flags `trusted: false` so the inspector can still surface
 * what the server presented (self-signed labs, expired certs, internal
 * CAs).
 */
export const TlsInspector: FC<TlsInspectorProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<TlsInspectorState>(
    toolId,
    DEFAULT_TLS_INSPECTOR_STATE,
  );
  const isCompact = zone === 'right' || zone === 'bottom';

  const runInspect = useCallback(async () => {
    const parsed = parseEndpoint(state.endpoint);
    if (!parsed) {
      setState({
        result: null,
        error: {
          kind: 'invalid_endpoint',
          message:
            'Enter a host or host:port (defaults to 443). IPv6 literals must be bracketed: [::1]:443',
        },
        loading: false,
      });
      return;
    }
    setState({ loading: true });
    try {
      const result = await tlsInspect(parsed);
      setState({ result, error: null, loading: false });
    } catch (err) {
      const e = toHyperspannerError(err);
      setState({
        result: null,
        error: { kind: e.kind, message: e.message },
        loading: false,
      });
    }
  }, [state.endpoint, setState]);

  const handleClear = useCallback(() => {
    setState({ ...DEFAULT_TLS_INSPECTOR_STATE });
  }, [setState]);

  const actions = (
    <>
      {/* No `aria-label` overrides — the button text already provides
          a clean accessible name (`Inspect` / `Clear`), and overriding
          to `"Connect and inspect"` made `getByRole('button', { name:
          /^inspect$/i })` in tests miss the button. Tooltips carry the
          longer hint without changing the accessible name. */}
      <LcarsPill
        size="small"
        onClick={runInspect}
        disabled={state.loading || state.endpoint.trim().length === 0}
        title="Connect and inspect"
      >
        {state.loading ? 'Inspecting…' : 'Inspect'}
      </LcarsPill>
      <LcarsPill
        size="small"
        onClick={handleClear}
        title="Clear input and results"
      >
        Clear
      </LcarsPill>
    </>
  );

  const status = renderStatus(state);

  return (
    <ToolFrame
      toolId={toolId}
      title="TLS Inspector"
      subtitle="Connect to a host:port over TLS and surface the negotiated version, cipher suite, and full certificate chain."
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={`${styles.container} ${isCompact ? styles.containerCompact : ''}`}>
        <div className={styles.endpointRow}>
          <span className={styles.label}>Endpoint</span>
          <input
            type="text"
            className={`${styles.input} ${isCompact ? styles.inputCompact : ''}`}
            value={state.endpoint}
            onChange={(e) => setState({ endpoint: e.currentTarget.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runInspect();
            }}
            placeholder="example.com or example.com:443"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Host or host:port"
          />
        </div>

        {state.result ? (
          <ResultView result={state.result} isCompact={isCompact} />
        ) : (
          // When an error is present, the status pill in the footer
          // already carries `state.error.message`. Echoing the same
          // string here would duplicate it in the DOM and break
          // `getByText` matchers in tests; show a short pointer in the
          // body and leave the detailed error to the pill.
          <div className={styles.placeholder}>
            {state.error
              ? 'See status below for details.'
              : state.loading
                ? 'Connecting…'
                : 'Type a host:port and press Inspect (or Enter).'}
          </div>
        )}
      </div>
    </ToolFrame>
  );
};

interface ResultViewProps {
  result: NonNullable<TlsInspectorState['result']>;
  isCompact: boolean;
}

const ResultView: FC<ResultViewProps> = ({ result, isCompact }) => {
  return (
    <div className={styles.result}>
      <dl className={`${styles.summary} ${isCompact ? styles.summaryCompact : ''}`}>
        <dt>Protocol</dt>
        <dd>{result.protocolVersion}</dd>
        <dt>Cipher Suite</dt>
        <dd>{result.cipherSuite}</dd>
        <dt>Trust</dt>
        <dd>
          <span
            className={
              result.trusted ? styles.trustOk : styles.trustWarn
            }
          >
            {result.trusted ? 'verified' : 'not verified'}
          </span>
        </dd>
        <dt>Chain length</dt>
        <dd>{result.certChain.length}</dd>
      </dl>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Certificate Chain</span>
        <ul className={styles.chain}>
          {result.certChain.map((cert, idx) => (
            <CertCard
              key={idx}
              cert={cert}
              index={idx}
              isCompact={isCompact}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

interface CertCardProps {
  cert: TlsCert;
  index: number;
  isCompact: boolean;
}

const CertCard: FC<CertCardProps> = ({ cert, index, isCompact }) => {
  return (
    <li className={`${styles.cert} ${isCompact ? styles.certCompact : ''}`}>
      <div className={styles.certHeader}>
        <span className={styles.certIndex}>{index === 0 ? 'leaf' : `#${index}`}</span>
        <span className={styles.certSubject}>{cert.subject}</span>
      </div>
      <dl className={styles.certDetails}>
        <dt>Issuer</dt>
        <dd>{cert.issuer}</dd>
        <dt>Valid</dt>
        <dd>
          {cert.notBefore} → {cert.notAfter}
        </dd>
        <dt>Serial</dt>
        <dd>{cert.serialNumber}</dd>
        <dt>Sig Algo</dt>
        <dd>{cert.signatureAlgorithm}</dd>
        {cert.subjectAltNames.length > 0 ? (
          <>
            <dt>SANs</dt>
            <dd>{cert.subjectAltNames.join(', ')}</dd>
          </>
        ) : null}
      </dl>
    </li>
  );
};

function renderStatus(state: TlsInspectorState): ReactNode {
  if (state.loading) {
    return <ToolStatusPill status="neutral">Inspecting…</ToolStatusPill>;
  }
  if (state.error) {
    return (
      <ToolStatusPill status="error" detail={state.error.kind}>
        {state.error.message}
      </ToolStatusPill>
    );
  }
  if (state.result) {
    const trustDetail = state.result.trusted ? 'trusted' : 'unverified';
    return (
      <ToolStatusPill
        status={state.result.trusted ? 'ok' : 'warn'}
        detail={`${state.result.protocolVersion} · ${trustDetail}`}
      >
        Connected
      </ToolStatusPill>
    );
  }
  return (
    <ToolStatusPill status="neutral" detail="Enter a host:port">
      Idle
    </ToolStatusPill>
  );
}
