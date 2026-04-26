import { create } from 'zustand';

/**
 * useUpdater — workspace-wide update-check state and install flow.
 *
 * Owns:
 *   - the on-launch update check (silent fail for offline tolerance)
 *   - the in-flight download + install lifecycle
 *   - banner dismissal state (so a "no thanks" doesn't keep nagging
 *     within the same session — but the badge persists)
 *
 * The Tauri plugins (`@tauri-apps/plugin-updater`,
 * `@tauri-apps/plugin-process`) are imported lazily through a small
 * test-seam pair (`__setUpdaterClientForTests` /
 * `__resetUpdaterClient`) so unit tests can run under jsdom without
 * the Tauri runtime. Production code goes straight through the real
 * plugin imports — see `defaultClient` below.
 *
 * The state machine is:
 *
 *   idle
 *     │
 *     ▼  checkForUpdates()
 *   checking
 *     │
 *     ├─→ up-to-date            (no update available)
 *     │
 *     ├─→ available              (newer version found)
 *     │       │
 *     │       ▼  installUpdate()
 *     │     downloading
 *     │       │
 *     │       ▼  (download finishes)
 *     │     ready-to-install
 *     │       │
 *     │       ▼  relaunchApp()
 *     │      <process exits, NSIS replaces binary, app restarts>
 *     │
 *     └─→ error                  (network / signature / etc — silent
 *                                 failure; surface via console only)
 */

export interface UpdateHandle {
  /** Semver version string from the manifest, e.g. `"0.0.2"`. */
  version: string;
  /** Markdown release notes from the manifest's `notes` field. */
  body: string | null;
  /** Drives the download + install. Progress callbacks fire as bytes
   *  arrive; the promise resolves when installation is queued
   *  (Windows: when the new installer is staged for restart). */
  downloadAndInstall: (
    onEvent: (event: UpdateProgressEvent) => void,
  ) => Promise<void>;
}

export type UpdateProgressEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' };

export interface UpdaterClient {
  check(): Promise<UpdateHandle | null>;
  relaunch(): Promise<void>;
}

/**
 * Default client — wraps the Tauri plugins. The dynamic imports keep
 * the plugin out of the test bundle (jsdom doesn't have the Tauri
 * runtime), so tests that don't override the client never actually
 * load the plugin module.
 */
const defaultClient: UpdaterClient = {
  async check() {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return null;
    return {
      version: update.version,
      body: update.body ?? null,
      downloadAndInstall: (onEvent) =>
        update.downloadAndInstall((event) => onEvent(event as UpdateProgressEvent)),
    };
  },
  async relaunch() {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  },
};

let activeClient: UpdaterClient = defaultClient;

/** Test seam — replace the Tauri-backed client with a fake for unit tests. */
export function __setUpdaterClientForTests(client: UpdaterClient): void {
  activeClient = client;
}

/** Test helper — restore the production client. */
export function __resetUpdaterClient(): void {
  activeClient = defaultClient;
}

export type UpdaterState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date' }
  | {
      kind: 'available';
      version: string;
      notes: string | null;
      handle: UpdateHandle;
    }
  | {
      kind: 'downloading';
      version: string;
      /** 0–100. Null when the manifest didn't declare a content length. */
      progress: number | null;
      bytesReceived: number;
      totalBytes: number | null;
    }
  | { kind: 'ready-to-install'; version: string }
  | { kind: 'error'; message: string };

interface UpdaterStore {
  state: UpdaterState;
  /** Set to true when the user dismisses the banner. The badge on the
   *  SETTINGS pill survives across dismissal — we only suppress the
   *  full-width banner so it doesn't keep nagging within the session. */
  bannerDismissed: boolean;
  /** Whether `checkForUpdates` has been invoked at least once. Lets
   *  the AppShell mount the on-launch check exactly once across
   *  re-renders without a useRef dance. */
  hasChecked: boolean;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  relaunchAfterInstall: () => Promise<void>;
  dismissBanner: () => void;
  /** Test helper — reset the store to the initial state. Useful in
   *  beforeEach hooks for component tests that mount the AppShell. */
  reset: () => void;
}

const INITIAL_STATE: UpdaterState = { kind: 'idle' };

export const useUpdaterStore = create<UpdaterStore>((set, get) => ({
  state: INITIAL_STATE,
  bannerDismissed: false,
  hasChecked: false,

  checkForUpdates: async () => {
    if (get().state.kind === 'checking') return;
    set({ state: { kind: 'checking' }, hasChecked: true });
    try {
      const handle = await activeClient.check();
      if (!handle) {
        set({ state: { kind: 'up-to-date' } });
        return;
      }
      set({
        state: {
          kind: 'available',
          version: handle.version,
          notes: handle.body,
          handle,
        },
        // Fresh availability — un-dismiss any prior banner state so the
        // user actually sees the new one.
        bannerDismissed: false,
      });
    } catch (err) {
      // Offline tolerance: a failed check is silent at the UI level.
      // We still capture the error in state so a Diagnostics readout
      // can surface it if the user explicitly looks. The badge / banner
      // do NOT render for `error` — the user sees no UI noise.
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn('[updater] check failed:', message);
      set({ state: { kind: 'error', message } });
    }
  },

  installUpdate: async () => {
    const current = get().state;
    if (current.kind !== 'available') return;
    const { handle, version } = current;

    set({
      state: {
        kind: 'downloading',
        version,
        progress: null,
        bytesReceived: 0,
        totalBytes: null,
      },
    });

    let totalBytes: number | null = null;
    let receivedBytes = 0;

    try {
      await handle.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength ?? null;
          set({
            state: {
              kind: 'downloading',
              version,
              progress: totalBytes ? 0 : null,
              bytesReceived: 0,
              totalBytes,
            },
          });
          return;
        }
        if (event.event === 'Progress') {
          receivedBytes += event.data.chunkLength;
          const progress = totalBytes
            ? Math.min(100, (receivedBytes / totalBytes) * 100)
            : null;
          set({
            state: {
              kind: 'downloading',
              version,
              progress,
              bytesReceived: receivedBytes,
              totalBytes,
            },
          });
          return;
        }
        if (event.event === 'Finished') {
          set({ state: { kind: 'ready-to-install', version } });
          return;
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error('[updater] install failed:', message);
      set({ state: { kind: 'error', message } });
    }
  },

  relaunchAfterInstall: async () => {
    try {
      await activeClient.relaunch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error('[updater] relaunch failed:', message);
      set({ state: { kind: 'error', message } });
    }
  },

  dismissBanner: () => set({ bannerDismissed: true }),

  reset: () =>
    set({
      state: INITIAL_STATE,
      bannerDismissed: false,
      hasChecked: false,
    }),
}));

// Selector helpers — components use these to subscribe narrowly. Each
// returns a primitive or a tuple, so Zustand's default shallow-eq
// treats unrelated state edits as no-ops.

export function useUpdaterState(): UpdaterState {
  return useUpdaterStore((s) => s.state);
}

export function useUpdaterHasUpdate(): boolean {
  return useUpdaterStore(
    (s) =>
      s.state.kind === 'available' ||
      s.state.kind === 'downloading' ||
      s.state.kind === 'ready-to-install',
  );
}

export function useUpdaterShouldShowBanner(): boolean {
  return useUpdaterStore(
    (s) => s.state.kind === 'available' && !s.bannerDismissed,
  );
}
