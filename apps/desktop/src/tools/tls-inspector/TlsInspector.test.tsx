// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __setInvokeForTests } from '../../ipc';
import type { InvokeFn } from '../../ipc';
import { clearToolState } from '../../state/useTool';
import { TlsInspector } from './TlsInspector';
import type { TlsInspectResult } from './lib';

const TOOL_ID = 'tls-inspector-test';

beforeEach(() => {
  clearToolState(TOOL_ID);
});

afterEach(() => {
  cleanup();
  clearToolState(TOOL_ID);
  __setInvokeForTests(null);
});

describe('TlsInspector', () => {
  it('renders idle status with empty input on first mount', () => {
    render(<TlsInspector toolId={TOOL_ID} />);
    expect(screen.getByText('Idle')).not.toBeNull();
  });

  it('rejects malformed endpoints with an inline error', () => {
    render(<TlsInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Host or host:port') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'host:abc' } });
    });
    const inspect = screen.getByRole('button', { name: /^inspect$/i });
    act(() => {
      fireEvent.click(inspect);
    });
    expect(
      screen.getByText(/Enter a host or host:port/i),
    ).not.toBeNull();
  });

  it('shows the negotiated protocol and cert chain on success', async () => {
    const result: TlsInspectResult = {
      protocolVersion: 'TLSv1_3',
      cipherSuite: 'TLS13_AES_128_GCM_SHA256',
      certChain: [
        {
          subject: 'CN=example.com',
          issuer: 'CN=Example CA',
          notBefore: '2025-01-01T00:00:00Z',
          notAfter: '2026-01-01T00:00:00Z',
          serialNumber: '01',
          signatureAlgorithm: '1.2.840.113549.1.1.11',
          subjectAltNames: ['DNSName("example.com")'],
        },
      ],
      trusted: true,
    };
    __setInvokeForTests((async () => result) as unknown as InvokeFn);

    render(<TlsInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Host or host:port') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'example.com' } });
    });
    const inspect = screen.getByRole('button', { name: /^inspect$/i });
    act(() => {
      fireEvent.click(inspect);
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.getByText('Connected')).not.toBeNull();
    expect(screen.getByText('TLSv1_3')).not.toBeNull();
    expect(screen.getByText('CN=example.com')).not.toBeNull();
  });

  it('shows the warn pill when the server cert is not trusted', async () => {
    const result: TlsInspectResult = {
      protocolVersion: 'TLSv1_2',
      cipherSuite: 'TLS_RSA_WITH_AES_128_GCM_SHA256',
      certChain: [
        {
          subject: 'CN=self-signed.local',
          issuer: 'CN=self-signed.local',
          notBefore: '2024-01-01T00:00:00Z',
          notAfter: '2027-01-01T00:00:00Z',
          serialNumber: 'AB',
          signatureAlgorithm: '1.2.840.113549.1.1.11',
          subjectAltNames: [],
        },
      ],
      trusted: false,
    };
    __setInvokeForTests((async () => result) as unknown as InvokeFn);

    render(<TlsInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Host or host:port') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'self-signed.local:8443' } });
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^inspect$/i }));
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.getByText('not verified')).not.toBeNull();
  });

  it('Enter key triggers inspect', async () => {
    const result: TlsInspectResult = {
      protocolVersion: 'TLSv1_3',
      cipherSuite: 'TLS13_AES_128_GCM_SHA256',
      certChain: [],
      trusted: true,
    };
    __setInvokeForTests((async () => result) as unknown as InvokeFn);

    render(<TlsInspector toolId={TOOL_ID} />);
    const input = screen.getByLabelText('Host or host:port') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'example.com' } });
    });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Connected')).not.toBeNull();
  });
});
