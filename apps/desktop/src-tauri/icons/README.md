# Icons

Placeholder icon set for Hyperspanner. Muted-salmon **H** glyph inside a dusty-purple ring on the picard-modern charcoal background.

Files:

- `32x32.png`, `128x128.png`, `128x128@2x.png` — PNG sizes referenced by `tauri.conf.json > bundle.icon`
- `icon.png` — 1024×1024 master
- `icon.ico` — Windows multi-resolution (16, 24, 32, 48, 64, 128, 256). **Required by `tauri-build` on Windows** even for `tauri dev` — missing this breaks the dev build.
- `icon.icns` — macOS bundle icon
- `icon-512.png` — extra source kept around for future `tauri icon` regeneration

Regenerate from a real wordmark when design lands:

```sh
pnpm --filter @hyperspanner/desktop tauri icon path/to/source.png
```

Phase 0 note: these are placeholders, not final brand marks. Plan-001 does not dictate a specific logo; product design picks one during Phase 1.
