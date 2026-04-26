---
type: plan
project: "Hyperspanner"
status: active
version: 1
updated: 2026-04-26
---

# Plan-007 — Packaging and Auto-Updates

This plan supersedes plan-002's high-level Phase 11 ("Testing /
packaging / first release"), pulling the packaging + auto-update
subset forward so a working install + update flow exists before
Phase 8 (Settings) and Phase 9 (Polish) wrap up.

## Goals

1. Ship an **NSIS installer** for Windows that installs in **per-user
   mode** (no admin elevation, lands in `%LOCALAPPDATA%\Programs\Hyperspanner`).
2. Ship **Linux installers** — `.deb`, `.rpm`, and `.AppImage` —
   produced by the same Tauri bundle pipeline.
3. Wire **auto-updates** through Tauri 2's official updater plugin,
   with **GitHub Releases as the manifest endpoint**. Each tagged
   release publishes a signed update manifest the running app pings
   on launch.
4. Surface a **VSCode-style "install update" UX**: a notification
   badge when a new version is available, a modal showing version +
   release notes + "Install now / Later", a clean download +
   restart flow.
5. Keep the flow **resilient offline**: a failed update check (no
   network, blocked endpoint, GitHub down) is silent — the app
   continues normally and re-checks on next launch.

## Decisions captured

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repo URL | `https://github.com/echozulucode/hyperspanner` | Public on first release; updater endpoint resolves there |
| License | MIT | Encourages use; LICENSE file at repo root |
| Code signing (Authenticode) | Skip for v0.x | Cert is $200-500/yr; revisit before non-technical beta users. SmartScreen warning is annoying but functional |
| Update check cadence | On launch only | Simple; offline-tolerant; no background timer to manage |
| Update UX placement | Both | Badge on SETTINGS pill (visibility) + Settings → Diagnostics section (full panel) |
| Release cadence | Tag push triggers build | Simple; no manual release-this-build dispatch |
| Platforms | Windows + Linux | macOS deferred (needs DMG signing + notarization) |
| Install mode | per-user (`installMode: "currentUser"`) | Avoids elevation prompts; matches VSCode user installer pattern |

## Sub-phases

### 7.6 — NSIS per-user installer + Linux bundle (CONFIG LANDED 2026-04-26)

**Status:** Code lives in `apps/desktop/src-tauri/tauri.conf.json`.
The bundle config now declares NSIS + deb + rpm + appimage as
explicit targets (was `"all"`), sets `bundle.windows.nsis.installMode:
"currentUser"`, and points `licenseFile` at `../../../LICENSE` so the
installer carries the MIT text. The publisher field is set to the
copyright holder so Windows Properties tab and the NSIS UI both
display correctly.

**What's left for verification:**

1. Run `pnpm tauri build` from the repo root (or
   `pnpm --filter @hyperspanner/desktop tauri build`).
2. Confirm three installer artifacts in
   `apps/desktop/src-tauri/target/release/bundle/`:
   - `nsis/Hyperspanner_0.0.0_x64-setup.exe`
   - `deb/hyperspanner_0.0.0_amd64.deb`  (only if building on Linux)
   - `appimage/hyperspanner_0.0.0_amd64.AppImage`  (Linux)
3. Run the NSIS .exe; confirm:
   - No UAC prompt.
   - Installs to `%LOCALAPPDATA%\Programs\Hyperspanner`.
   - Start menu entry created.
   - App launches and runs.
4. Uninstall via Settings → Apps; confirm clean removal.

**Linux .rpm build needs:** `rpmbuild` installed on the build host
(`sudo apt install rpm` on Debian/Ubuntu CI runners). The .deb +
AppImage targets work out of the box on Ubuntu.

### 7.7 — Updater signing keys + Tauri plugin

**This is a one-time setup step, mostly hands-on:**

1. **Generate the key pair** (on your local machine, NOT in CI):
   ```bash
   pnpm --filter @hyperspanner/desktop tauri signer generate \
       -w ~/.tauri/hyperspanner-updater.key
   ```
   This writes:
   - `~/.tauri/hyperspanner-updater.key` — the **private** key. Keep
     this secret. Never commit it. Treat it like a password.
   - `~/.tauri/hyperspanner-updater.key.pub` — the **public** key.
     Goes into `tauri.conf.json` (committed to the repo).

   When prompted, set a passphrase on the private key. Pick something
   memorable but strong; you'll need it for CI.

2. **Copy the public key** out of the `.pub` file and replace the
   `REPLACE_WITH_GENERATED_UPDATER_PUBLIC_KEY` placeholder in
   `tauri.conf.json` → `plugins.updater.pubkey`. Set
   `plugins.updater.active` to `true` at the same time.

3. **Add the Rust plugin** to `apps/desktop/src-tauri/Cargo.toml`:
   ```toml
   [dependencies]
   tauri-plugin-updater = "2"
   ```

4. **Register the plugin** in `apps/desktop/src-tauri/src/lib.rs`:
   ```rust
   tauri::Builder::default()
       .plugin(tauri_plugin_updater::Builder::new().build())
       // ... other plugins, invoke handlers
       .run(tauri::generate_context!())
   ```

5. **Add the JS plugin** to `apps/desktop/package.json`:
   ```bash
   pnpm --filter @hyperspanner/desktop add @tauri-apps/plugin-updater
   pnpm --filter @hyperspanner/desktop add @tauri-apps/plugin-process
   ```
   The process plugin gives us `relaunch()` for the post-install restart.

6. **Add the capability**. Tauri 2's permission model requires explicit
   capability grants. Edit
   `apps/desktop/src-tauri/capabilities/default.json` (or create one)
   to include:
   ```json
   {
     "permissions": [
       "updater:default",
       "process:allow-restart"
     ]
   }
   ```

7. **Store the private key + passphrase as GitHub Actions secrets**
   (in the GitHub repo settings under Secrets and variables → Actions):
   - `TAURI_SIGNING_PRIVATE_KEY` — paste the contents of
     `~/.tauri/hyperspanner-updater.key`.
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the passphrase.

### 7.8 — GitHub Actions release workflow

**Create `.github/workflows/release.yml`** — the canonical pattern
uses `tauri-apps/tauri-action`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf \
            rpm

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: pnpm install

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Hyperspanner ${{ github.ref_name }}'
          releaseBody: 'See the assets below to download and install.'
          releaseDraft: true
          prerelease: false
          projectPath: apps/desktop
          updaterJsonPreferNsis: true
```

**Notes:**
- `releaseDraft: true` — releases are created as drafts so you can
  review and edit notes before publishing. Once you publish the draft,
  the manifest URL becomes live and clients pick up the update.
- `updaterJsonPreferNsis: true` — Windows clients get the NSIS
  installer (not MSI) for the update download.
- `tauri-action` automatically generates `latest.json` (the updater
  manifest) and uploads it as a release asset.
- The `latest.json` URL stays at
  `https://github.com/echozulucode/hyperspanner/releases/latest/download/latest.json`
  — that's what's already configured in `tauri.conf.json`.

### 7.9 — In-app update UI

**Architecture:**

- A small `useUpdater()` hook owns update-check state. Runs once on
  app mount, calls `check()` from `@tauri-apps/plugin-updater`,
  stores the result in a Zustand slice (or React state if simple
  enough). Failures are swallowed silently — offline tolerance.

- The `useUpdater()` state shape:
  ```ts
  type UpdaterState =
    | { kind: 'idle' }                                    // pre-check or post-dismiss
    | { kind: 'checking' }                                // check in flight
    | { kind: 'up-to-date' }                              // current is latest
    | { kind: 'available'; version: string; notes: string } // newer version found
    | { kind: 'downloading'; version: string; progress: number }
    | { kind: 'ready-to-install'; version: string }       // download done, restart pending
    | { kind: 'error'; message: string }                  // surfaces only via dev console
  ```

- **Badge on SETTINGS pill** — when `kind === 'available'`, an
  orange dot decorates the SETTINGS pill in the top rail. CSS-only
  pseudo-element, no extra DOM.

- **Settings → Updates section** (new in `SystemSettings.tsx`):
  - Current app version (from `package.json` via Vite's `import.meta.env`).
  - "Check for updates" button (manual override of the automatic
    on-launch check).
  - When `available`: shows version, notes, "Install update" CTA.
  - When `downloading`: progress bar.
  - When `ready-to-install`: "Restart now" CTA + "Restart later"
    dismiss.

- **Banner notification** when update is available — small
  non-modal strip across the top of the workspace, click to open
  the Settings → Updates section. Dismissible; reappears on next
  launch if still applicable.

- **Install flow:**
  1. User clicks "Install update".
  2. App calls `update.downloadAndInstall(progressCb)`.
  3. Progress updates the state to `downloading` with `progress 0-100`.
  4. On completion, state flips to `ready-to-install`.
  5. User clicks "Restart now" → app calls `relaunch()` from
     `@tauri-apps/plugin-process`.
  6. NSIS replaces the binary in-place; new version starts.

**Files to write:**

- `apps/desktop/src/state/useUpdater.ts` — the hook + Zustand slice.
- `apps/desktop/src/state/useUpdater.test.ts` — unit tests with the
  Tauri plugin mocked.
- `apps/desktop/src/shell/UpdaterBanner.tsx` + `.module.css` — the
  top-of-workspace notification strip.
- Augment `apps/desktop/src/tools/system-settings/SystemSettings.tsx`
  with the Updates section.
- Augment `apps/desktop/src/shell/AppShell.tsx` to:
  - Mount the `useUpdater()` hook.
  - Render `<UpdaterBanner />` above the workspace grid when state
    is `available` and the user hasn't dismissed.
  - Add the badge CSS to the SETTINGS pill (a small `::after` dot
    when an update is available — read state via the hook).

### 7.10 — End-to-end verification

Once 7.6–7.9 land:

1. Bump version to `0.0.1` in **all four** spots that need to track:
   `package.json` (root + `apps/desktop` + `packages/lcars-ui`),
   `apps/desktop/src-tauri/Cargo.toml`, and
   `apps/desktop/src-tauri/tauri.conf.json`. (We can add a small
   `scripts/bump-version.mjs` later to keep these in sync.)
2. Push tag `v0.0.1`. Watch the GitHub Action build the installers,
   sign them, and create a draft release.
3. Edit the release notes if desired, then **publish** the draft.
   The manifest URL becomes live.
4. Install the v0.0.1 installer locally.
5. Bump to `0.0.2`, push tag `v0.0.2`, publish that release.
6. Run the v0.0.1 install. Within a few seconds of launch, the
   SETTINGS pill should grow an orange dot and the banner should
   appear.
7. Click "Install update" → progress bar → "Restart now" → relaunch
   into v0.0.2.
8. Verify the badge is gone after the relaunch.

## Dependencies + risks

- **Authenticode-not-signed warning** — first install of any
  unsigned NSIS .exe shows a Microsoft Defender SmartScreen warning.
  The user clicks "More info" → "Run anyway". This is expected and
  documented; revisit at v1.0.
- **NSIS in CI** — the GitHub Actions Windows runner has NSIS
  pre-installed; no setup step needed. Tauri's bundle pipeline
  drives it directly.
- **Linux .rpm dependency** — the Ubuntu CI runner needs `rpmbuild`
  installed (apt-get step shown above). If you prefer, drop .rpm
  from the `bundle.targets` array and ship only .deb + AppImage.
- **Updater plugin requires capability grant** — easy to forget.
  If the in-app updater doesn't fire, double-check
  `capabilities/default.json` includes `updater:default` and
  `process:allow-restart`.
- **"latest.json" URL stability** — GitHub's
  `releases/latest/download/<asset>` redirect always points at the
  most recent non-prerelease, non-draft release. Keep prereleases
  flagged correctly so they don't clobber the channel.
- **Per-user install + updater interaction** — perUser installs
  to `%LOCALAPPDATA%\Programs`, which the running user already has
  write access to. Updater can replace the binary without elevation
  even on locked-down corporate machines.

## Out of scope for this plan

- macOS DMG + notarization (deferred — needs Apple Developer
  account + Xcode toolchain).
- Code signing certificates (Authenticode for Windows; gpg for Linux
  packages).
- Multi-channel releases (stable / beta / nightly).
- Delta updates (Tauri's updater downloads the full installer each
  time; for ~30 MB binaries this is fine, revisit if it grows).
- Settings → Diagnostics broader content (logs, telemetry,
  version readouts beyond just the updater) — that's Phase 8.

## Decisions Made

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-26 | NSIS `installMode: "currentUser"` rather than `perMachine` | Matches VSCode user-installer pattern; avoids elevation prompts; lets the updater replace binaries without admin |
| 2026-04-26 | GitHub Releases as the updater endpoint | Static, free, predictable URL pattern via `releases/latest/download/<asset>`; tauri-action publishes the manifest there automatically |
| 2026-04-26 | Update check on launch only (no periodic timer) | Simpler state; offline-tolerant by definition; avoids battery drain on laptops |
| 2026-04-26 | Releases created as drafts | Lets us write release notes before going live; publishing the draft is the moment the channel updates |
| 2026-04-26 | Skip Authenticode for v0.x | $200-500/yr cost not justified for early-access; SmartScreen warning is annoying but functional |

## Errors Encountered

(To be populated as we hit them in 7.7–7.10.)
