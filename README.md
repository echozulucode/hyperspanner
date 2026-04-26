# Hyperspanner

A desktop developer utility suite. Fourteen common tools (diff, validate, encode,
decode, hash, inspect) bundled into a single keyboard-first workspace with a
distinctive visual style.

![Hyperspanner home view](images/screenshots/2026-04-26%2009_26_36-Hyperspanner.png)

## What's included

| Category | Tools |
|---|---|
| Text and format | Text Diff, Case Transform, Whitespace Clean |
| Validation | JSON Validator, YAML Validator, Regex Tester |
| Data and encoding | Hash Workbench (MD5, SHA-1, SHA-256, SHA-512), Base64 Pad, URL Codec |
| Binary | Hex Inspector, Number Converter (uint8 through float64), Protobuf Decode |
| Network | CIDR Calculator, TLS Inspector |

A command palette (Cmd-K on macOS, Ctrl-K on Windows and Linux) launches any
tool and exposes global actions. The home view doubles as a launchpad with
pinned, recent, and browse-by-category cards.

## Screenshots

### Home

Pin favorites for quick access, browse by category, or jump to the command
palette.

![Home view](images/screenshots/2026-04-26%2009_26_36-Hyperspanner.png)

### Center tool with inspector

JSON Validator open in the main pane, Number Converter pinned to the right
inspector for a quick hex and decimal lookup alongside whatever you are
working on.

![JSON Validator with Number Converter inspector](images/screenshots/2026-04-26%2009_27_18-Hyperspanner.png)

### Multi-tool workspace

Text Diff in a vertical split, Hash Workbench docked in the bottom console,
Number Converter still in the inspector. Every tool follows the same density
rules in narrow zones so all four panes stay readable.

![Multi-tool layout](images/screenshots/2026-04-26%2009_28_33-Hyperspanner.png)

### Theme variants

Settings, Appearance ships four color schemes. Theme switches re-skin the
whole window instantly. No reload required.

![Settings, theme picker](images/screenshots/2026-04-26%2009_30_32-Hyperspanner.png)

## Install

Download the latest release for your platform from the
[releases page](https://github.com/echozulucode/hyperspanner/releases/latest).

### Windows

Run `Hyperspanner_<version>_x64-setup.exe`. The installer runs in per-user
mode, no administrator elevation required, and lands in
`%LOCALAPPDATA%\Programs\Hyperspanner`.

On first install Windows SmartScreen will warn about an unrecognized
publisher. Click **More info**, then **Run anyway**. (The application is not
yet code-signed; this is expected during the early-access period.)

### Linux

Choose the format that matches your distribution:

- **AppImage**: runs anywhere, no install. Make it executable
  (`chmod +x hyperspanner_<version>_amd64.AppImage`) and double-click.
- **Debian, Ubuntu**: `sudo apt install ./hyperspanner_<version>_amd64.deb`
- **Fedora, RHEL**: `sudo dnf install ./hyperspanner-<version>-1.x86_64.rpm`

## Automatic updates

Hyperspanner checks for new releases when you launch it. When a newer version
is available a notification appears at the top of the workspace and a small
indicator dot decorates the **Settings** button.

To install an update:

1. Open **Settings** (the gear icon in the top bar).
2. Scroll to the **Updates** section.
3. Click **Install update**. The new version downloads with a progress bar.
4. Click **Restart now**. Hyperspanner closes, applies the update, and
   relaunches into the new version.

If you are offline or the check otherwise fails, the application continues
running normally; the check is retried on the next launch.

## Reporting issues

File bug reports and feature requests on the
[issue tracker](https://github.com/echozulucode/hyperspanner/issues). Please
include your operating system, Hyperspanner version (visible in **Settings**,
**Updates**), and steps to reproduce.

## License

MIT. See [`LICENSE`](LICENSE).
