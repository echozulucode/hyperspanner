import { useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';

import type { Zone } from '../../state';
import { useTool } from '../../state/useTool';
import { ToolFrame, ToolStatusPill } from '../components';
import { isInCidr, parseCidr } from './lib';
import type { CidrInfo, CidrParseResult, MembershipResult } from './lib';
import styles from './CidrCalc.module.css';

export interface CidrCalcProps {
  toolId: string;
  zone?: Zone;
}

interface CidrCalcState {
  input: string;
  memberInput: string;
}

const DEFAULT_STATE: CidrCalcState = {
  input: '',
  memberInput: '',
};

/**
 * CIDR Calculator — compute network details from CIDR notation.
 *
 * Single focused input for the CIDR (e.g. "10.0.0.0/24"), a computed
 * table of network properties, and a membership test input to check if
 * an IP is in the subnet.
 */
export const CidrCalc: FC<CidrCalcProps> = ({ toolId, zone }) => {
  const { state, setState } = useTool<CidrCalcState>(toolId, DEFAULT_STATE);
  const isCompact = zone === 'right' || zone === 'bottom';

  const parseResult = useMemo<CidrParseResult>(
    () => parseCidr(state.input),
    [state.input],
  );

  const membershipResult = useMemo<MembershipResult | null>(() => {
    if (parseResult.kind !== 'ok' || state.memberInput.trim().length === 0) {
      return null;
    }
    return isInCidr(state.memberInput, parseResult.info);
  }, [parseResult, state.memberInput]);

  const handleInputChange = useCallback(
    (input: string) => {
      setState({ input });
    },
    [setState],
  );

  const handleMemberInputChange = useCallback(
    (memberInput: string) => {
      setState({ memberInput });
    },
    [setState],
  );

  const status = renderStatus(parseResult);

  return (
    <ToolFrame
      toolId={toolId}
      title="CIDR Calculator"
      subtitle={
        !isCompact
          ? 'Enter a CIDR block (e.g. 10.0.0.0/24 or 2001:db8::/32) to see network details and test membership.'
          : undefined
      }
      zone={zone}
      status={status}
      className={isCompact ? styles.frameCompact : ''}
    >
      <div className={styles.container}>
        <div className={styles.inputSection}>
          <input
            type="text"
            className={`${styles.input}`}
            value={state.input}
            onChange={(e) => handleInputChange(e.currentTarget.value)}
            placeholder="Enter CIDR block (e.g., 10.0.0.0/24 or 2001:db8::/32)"
            spellCheck={false}
            aria-label="CIDR input"
          />
        </div>

        {parseResult.kind === 'ok' && (
          <>
            <div className={styles.tableSection}>
              {renderTable(parseResult.info, isCompact)}
            </div>

            {!isCompact && (
              <div className={styles.membershipSection}>
                <div className={styles.membershipLabel}>Membership Test</div>
                <div className={styles.membershipInput}>
                  <input
                    type="text"
                    className={styles.input}
                    value={state.memberInput}
                    onChange={(e) => handleMemberInputChange(e.currentTarget.value)}
                    placeholder="Enter an IP to check membership"
                    spellCheck={false}
                    aria-label="Membership test IP"
                  />
                  {membershipResult && renderMembershipChip(membershipResult)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolFrame>
  );
};

function renderStatus(result: CidrParseResult): ReactNode {
  if (result.kind === 'empty') {
    return (
      <ToolStatusPill status="neutral" detail="Enter a CIDR block to calculate">
        Idle
      </ToolStatusPill>
    );
  }

  if (result.kind === 'error') {
    return (
      <ToolStatusPill status="error" detail="">
        {result.message}
      </ToolStatusPill>
    );
  }

  // kind === 'ok'
  const info = result.info;
  const detail =
    info.kind === 'ipv4'
      ? `IPv4 · ${info.prefixLength} · ${info.totalAddresses} addresses`
      : `IPv6 · ${info.prefixLength} · 2^${128 - parseInt(info.prefixLength)}`;

  return (
    <ToolStatusPill status="ok" detail={detail}>
      Valid
    </ToolStatusPill>
  );
}

function renderTable(info: CidrInfo, isCompact: boolean): ReactNode {
  const rows = info.kind === 'ipv4' ? renderIPv4Table(info) : renderIPv6Table(info);

  return (
    <dl className={`${styles.table} ${isCompact ? styles.tableCompact : ''}`}>
      {rows}
    </dl>
  );
}

function renderIPv4Table(info: Extract<CidrInfo, { kind: 'ipv4' }>): ReactNode[] {
  const rows: ReactNode[] = [];

  const fields = [
    ['Network Address', info.networkAddress],
    ['Broadcast Address', info.broadcastAddress],
    ['First Host', info.firstHost],
    ['Last Host', info.lastHost],
    ['Subnet Mask', info.subnetMask],
    ['Wildcard Mask', info.wildcardMask],
    ['Prefix Length', info.prefixLength],
    ['Total Addresses', info.totalAddresses],
    ['Usable Hosts', info.usableHosts],
    ['Address Class', info.addressClass],
  ];

  for (const [label, value] of fields) {
    rows.push(
      <dt key={`dt-${label}`} className={styles.dt}>
        {label}
      </dt>,
      <dd key={`dd-${label}`} className={styles.dd}>
        <code>{value}</code>
      </dd>,
    );
  }

  if (info.flags.length > 0) {
    rows.push(
      <dt key="dt-flags" className={styles.dt}>
        Flags
      </dt>,
      <dd key="dd-flags" className={styles.dd}>
        <div className={styles.flags}>
          {info.flags.map((flag) => (
            <span key={flag} className={styles.flag}>
              {flag}
            </span>
          ))}
        </div>
      </dd>,
    );
  }

  return rows;
}

function renderIPv6Table(info: Extract<CidrInfo, { kind: 'ipv6' }>): ReactNode[] {
  const rows: ReactNode[] = [];

  const fields = [
    ['Network Address', info.networkAddress],
    ['Prefix Length', info.prefixLength],
    ['Total Addresses', info.totalAddresses],
  ];

  for (const [label, value] of fields) {
    rows.push(
      <dt key={`dt-${label}`} className={styles.dt}>
        {label}
      </dt>,
      <dd key={`dd-${label}`} className={styles.dd}>
        <code>{value}</code>
      </dd>,
    );
  }

  if (info.flags.length > 0) {
    rows.push(
      <dt key="dt-flags" className={styles.dt}>
        Flags
      </dt>,
      <dd key="dd-flags" className={styles.dd}>
        <div className={styles.flags}>
          {info.flags.map((flag) => (
            <span key={flag} className={styles.flag}>
              {flag}
            </span>
          ))}
        </div>
      </dd>,
    );
  }

  return rows;
}

function renderMembershipChip(result: MembershipResult): ReactNode {
  if (result.kind === 'error') {
    return <span className={`${styles.chip} ${styles.chipError}`}>{result.message}</span>;
  }

  const isIn = result.kind === 'in';
  return (
    <span className={`${styles.chip} ${isIn ? styles.chipIn : styles.chipOut}`}>
      {isIn ? 'IN' : 'OUT'}
    </span>
  );
}
