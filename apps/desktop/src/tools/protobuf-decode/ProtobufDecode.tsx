import { useCallback, useEffect, useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { LcarsPill } from '@hyperspanner/lcars-ui';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import { decodeProtobuf, toHyperspannerError } from '../../ipc';
import {
  DEFAULT_PROTOBUF_DECODE_STATE,
  countFields,
  summarizeValue,
  type ProtobufDecodeState,
  type WireField,
} from './lib';
import styles from './ProtobufDecode.module.css';

export interface ProtobufDecodeProps {
  toolId: string;
  zone?: Zone;
}

const DEBOUNCE_MS = 300;

/**
 * Protobuf Decode — schema-less wire-format inspector.
 *
 * The user pastes hex-encoded protobuf bytes; the Rust backend parses
 * them as raw wire format and returns a tree of fields. The UI renders
 * the tree with one row per field, indenting nested messages.
 *
 * No `.proto` schema is required — useful for dumping unknown payloads,
 * quickly checking what an RPC trace contains, or verifying the
 * structure of a serialized message before plumbing it elsewhere.
 */
export const ProtobufDecode: FC<ProtobufDecodeProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<ProtobufDecodeState>(
    toolId,
    DEFAULT_PROTOBUF_DECODE_STATE,
  );
  const isCompact = zone === 'right' || zone === 'bottom';
  const pendingDecode = useRef<number | null>(null);

  // Debounce decoding so we don't fire a Rust round-trip on every
  // keystroke. 300ms is enough that hex-pasting feels instant.
  useEffect(() => {
    if (pendingDecode.current !== null) {
      window.clearTimeout(pendingDecode.current);
    }
    if (state.bytesHex.trim().length === 0) {
      // Empty input → reset cleanly without a backend call.
      if (state.fields.length > 0 || state.error || state.loading) {
        setState({ fields: [], error: null, loading: false });
      }
      return;
    }
    pendingDecode.current = window.setTimeout(() => {
      runDecode();
    }, DEBOUNCE_MS);
    return () => {
      if (pendingDecode.current !== null) {
        window.clearTimeout(pendingDecode.current);
      }
    };
    // `runDecode` depends only on `state.bytesHex` and `setState` —
    // capturing it in this hook would create a stale closure on
    // re-renders, so we declare the deps narrowly and inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bytesHex]);

  const runDecode = useCallback(async () => {
    setState({ loading: true });
    try {
      const fields = await decodeProtobuf({ bytesHex: state.bytesHex });
      setState({ fields, error: null, loading: false });
    } catch (err) {
      const e = toHyperspannerError(err);
      setState({
        fields: [],
        error: { kind: e.kind, message: e.message },
        loading: false,
      });
    }
  }, [state.bytesHex, setState]);

  const handleClear = useCallback(() => {
    setState({ bytesHex: '', fields: [], error: null, loading: false });
  }, [setState]);

  const handleSample = useCallback(() => {
    // A small canned payload that shows off the three main wire types:
    //   field 1 (varint) = 150
    //   field 2 (string) = "hello"
    //   field 3 (nested message with two varints)
    setState({
      bytesHex: '08 96 01 12 05 68 65 6C 6C 6F 1A 04 08 07 10 08',
    });
  }, [setState]);

  const actions = (
    <>
      <LcarsPill
        size="small"
        onClick={handleSample}
        aria-label="Insert a sample payload"
      >
        Sample
      </LcarsPill>
      <LcarsPill
        size="small"
        onClick={handleClear}
        aria-label="Clear input and results"
      >
        Clear
      </LcarsPill>
    </>
  );

  const status = renderStatus(state);

  return (
    <ToolFrame
      toolId={toolId}
      title="Protobuf Decode"
      subtitle="Paste hex-encoded protobuf wire bytes. The decoder shows the field structure without requiring a .proto schema."
      zone={zone}
      actions={actions}
      status={status}
    >
      <div className={`${styles.container} ${isCompact ? styles.containerCompact : ''}`}>
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Hex Input</span>
          <textarea
            className={`${styles.input} ${isCompact ? styles.inputCompact : ''}`}
            value={state.bytesHex}
            onChange={(e) => setState({ bytesHex: e.currentTarget.value })}
            placeholder="08 96 01 12 05 68 65 6C 6C 6F …"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Protobuf hex input"
          />
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Decoded Tree</span>
          <div className={`${styles.tree} ${isCompact ? styles.treeCompact : ''}`}>
            {state.error ? (
              <div className={styles.empty}>{state.error.message}</div>
            ) : state.fields.length === 0 ? (
              <div className={styles.empty}>
                {state.bytesHex.trim().length === 0
                  ? 'Paste hex bytes to decode.'
                  : 'Decoding…'}
              </div>
            ) : (
              <FieldList fields={state.fields} depth={0} />
            )}
          </div>
        </div>
      </div>
    </ToolFrame>
  );
};

interface FieldListProps {
  fields: WireField[];
  depth: number;
}

const FieldList: FC<FieldListProps> = ({ fields, depth }) => {
  return (
    <ul
      className={styles.fieldList}
      style={{ paddingLeft: depth === 0 ? 0 : '0.85rem' }}
    >
      {fields.map((f, idx) => (
        <li key={idx} className={styles.fieldRow}>
          <span className={styles.fieldNumber}>#{f.field}</span>
          <span className={styles.fieldType}>{f.wireTypeLabel}</span>
          <span className={styles.fieldValue}>{summarizeValue(f.value)}</span>
          {f.value.kind === 'message' ? (
            <FieldList fields={f.value.fields} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
};

function renderStatus(state: ProtobufDecodeState): ReactNode {
  if (state.error) {
    return (
      <ToolStatusPill status="error" detail={state.error.kind}>
        {state.error.message}
      </ToolStatusPill>
    );
  }
  if (state.loading) {
    return <ToolStatusPill status="neutral">Decoding…</ToolStatusPill>;
  }
  if (state.bytesHex.trim().length === 0) {
    return (
      <ToolStatusPill status="neutral" detail="Paste hex to decode">
        Idle
      </ToolStatusPill>
    );
  }
  if (state.fields.length === 0) {
    return <ToolStatusPill status="neutral">No fields</ToolStatusPill>;
  }
  const total = countFields(state.fields);
  return (
    <ToolStatusPill
      status="ok"
      detail={`${state.fields.length} top-level · ${total} total`}
    >
      Decoded
    </ToolStatusPill>
  );
}
