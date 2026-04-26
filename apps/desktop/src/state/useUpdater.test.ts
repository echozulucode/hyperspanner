// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetUpdaterClient,
  __setUpdaterClientForTests,
  useUpdaterStore,
  type UpdateHandle,
  type UpdaterClient,
} from './useUpdater';

/**
 * useUpdater — verify the state machine without the Tauri runtime.
 *
 * The test seam swaps the production client (which lazy-imports the
 * Tauri plugins) for a hand-rolled fake. Each test resets the store
 * and the client between runs.
 */

beforeEach(() => {
  useUpdaterStore.getState().reset();
});

afterEach(() => {
  __resetUpdaterClient();
});

function makeHandle(version: string): UpdateHandle {
  // Default download flow: fires Started + one Progress + Finished.
  return {
    version,
    body: `Release notes for ${version}`,
    downloadAndInstall: vi.fn(async (onEvent) => {
      onEvent({ event: 'Started', data: { contentLength: 100 } });
      onEvent({ event: 'Progress', data: { chunkLength: 100 } });
      onEvent({ event: 'Finished' });
    }),
  };
}

function makeClient(handle: UpdateHandle | null): UpdaterClient {
  return {
    check: vi.fn(async () => handle),
    relaunch: vi.fn(async () => undefined),
  };
}

describe('useUpdaterStore.checkForUpdates', () => {
  it('starts in idle state', () => {
    expect(useUpdaterStore.getState().state.kind).toBe('idle');
    expect(useUpdaterStore.getState().hasChecked).toBe(false);
  });

  it('transitions checking → up-to-date when no update is available', async () => {
    __setUpdaterClientForTests(makeClient(null));
    await useUpdaterStore.getState().checkForUpdates();
    expect(useUpdaterStore.getState().state.kind).toBe('up-to-date');
    expect(useUpdaterStore.getState().hasChecked).toBe(true);
  });

  it('transitions checking → available when a newer version is found', async () => {
    const handle = makeHandle('0.0.2');
    __setUpdaterClientForTests(makeClient(handle));
    await useUpdaterStore.getState().checkForUpdates();
    const state = useUpdaterStore.getState().state;
    expect(state.kind).toBe('available');
    if (state.kind === 'available') {
      expect(state.version).toBe('0.0.2');
      expect(state.notes).toBe('Release notes for 0.0.2');
    }
  });

  it('handles a thrown error without escalating to the UI', async () => {
    const failing: UpdaterClient = {
      check: vi.fn(async () => {
        throw new Error('network unreachable');
      }),
      relaunch: vi.fn(),
    };
    __setUpdaterClientForTests(failing);
    await useUpdaterStore.getState().checkForUpdates();
    const state = useUpdaterStore.getState().state;
    expect(state.kind).toBe('error');
    if (state.kind === 'error') {
      expect(state.message).toContain('network unreachable');
    }
  });

  it('un-dismisses any prior banner state when a new update arrives', async () => {
    useUpdaterStore.setState({ bannerDismissed: true });
    __setUpdaterClientForTests(makeClient(makeHandle('0.0.3')));
    await useUpdaterStore.getState().checkForUpdates();
    expect(useUpdaterStore.getState().bannerDismissed).toBe(false);
  });

  it('is idempotent while a check is in flight', async () => {
    let resolveCheck: ((handle: UpdateHandle | null) => void) | undefined;
    const handle = makeHandle('0.0.2');
    const slowClient: UpdaterClient = {
      check: vi.fn(
        () => new Promise<UpdateHandle | null>((res) => {
          resolveCheck = res;
        }),
      ),
      relaunch: vi.fn(),
    };
    __setUpdaterClientForTests(slowClient);

    const first = useUpdaterStore.getState().checkForUpdates();
    const second = useUpdaterStore.getState().checkForUpdates();
    expect(slowClient.check).toHaveBeenCalledTimes(1);

    resolveCheck?.(handle);
    await Promise.all([first, second]);
    expect(useUpdaterStore.getState().state.kind).toBe('available');
  });
});

describe('useUpdaterStore.installUpdate', () => {
  it('drives the download → ready-to-install lifecycle', async () => {
    const handle = makeHandle('0.0.4');
    __setUpdaterClientForTests(makeClient(handle));
    await useUpdaterStore.getState().checkForUpdates();
    await useUpdaterStore.getState().installUpdate();
    const state = useUpdaterStore.getState().state;
    expect(state.kind).toBe('ready-to-install');
    if (state.kind === 'ready-to-install') {
      expect(state.version).toBe('0.0.4');
    }
    expect(handle.downloadAndInstall).toHaveBeenCalledTimes(1);
  });

  it('reports progress percentages while bytes arrive', async () => {
    let progressTrace: Array<number | null> = [];
    const customHandle: UpdateHandle = {
      version: '0.0.5',
      body: null,
      downloadAndInstall: vi.fn(async (onEvent) => {
        onEvent({ event: 'Started', data: { contentLength: 200 } });
        onEvent({ event: 'Progress', data: { chunkLength: 50 } });
        // After this progress event, store state.progress should be 25%.
        progressTrace.push(
          (useUpdaterStore.getState().state as { progress: number | null })
            .progress ?? null,
        );
        onEvent({ event: 'Progress', data: { chunkLength: 50 } });
        progressTrace.push(
          (useUpdaterStore.getState().state as { progress: number | null })
            .progress ?? null,
        );
        onEvent({ event: 'Finished' });
      }),
    };
    __setUpdaterClientForTests(makeClient(customHandle));
    await useUpdaterStore.getState().checkForUpdates();
    await useUpdaterStore.getState().installUpdate();
    expect(progressTrace).toEqual([25, 50]);
  });

  it('is a no-op when not in available state', async () => {
    // Store is in `idle`; installUpdate should silently do nothing.
    await useUpdaterStore.getState().installUpdate();
    expect(useUpdaterStore.getState().state.kind).toBe('idle');
  });

  it('reports a failed install as error without escalating', async () => {
    const failingHandle: UpdateHandle = {
      version: '0.0.6',
      body: null,
      downloadAndInstall: vi.fn(async () => {
        throw new Error('signature mismatch');
      }),
    };
    __setUpdaterClientForTests(makeClient(failingHandle));
    await useUpdaterStore.getState().checkForUpdates();
    await useUpdaterStore.getState().installUpdate();
    const state = useUpdaterStore.getState().state;
    expect(state.kind).toBe('error');
    if (state.kind === 'error') {
      expect(state.message).toContain('signature mismatch');
    }
  });
});

describe('useUpdaterStore.dismissBanner / relaunchAfterInstall', () => {
  it('dismissBanner sets the flag', () => {
    useUpdaterStore.getState().dismissBanner();
    expect(useUpdaterStore.getState().bannerDismissed).toBe(true);
  });

  it('relaunchAfterInstall calls the client', async () => {
    const client = makeClient(null);
    __setUpdaterClientForTests(client);
    await useUpdaterStore.getState().relaunchAfterInstall();
    expect(client.relaunch).toHaveBeenCalledTimes(1);
  });
});
