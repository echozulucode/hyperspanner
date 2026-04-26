#!/usr/bin/env node
/**
 * bump-version.mjs — single-source-of-truth version bump.
 *
 * Hyperspanner's version is mirrored across five files:
 *
 *   1. package.json                                  (root)
 *   2. apps/desktop/package.json
 *   3. packages/lcars-ui/package.json
 *   4. apps/desktop/src-tauri/tauri.conf.json
 *   5. apps/desktop/src-tauri/Cargo.toml             (the [package] block)
 *
 * Tauri reads from #4 at runtime (`getVersion()`), the bundler reads
 * from #5 at build time, npm/pnpm tooling reads from #1–#3, and the
 * Cargo.lock will pick up #5 on the next build. Keeping them all in
 * sync by hand is tedious + error-prone; this script does it in one
 * step and (optionally) commits + tags.
 *
 * Usage:
 *
 *   node scripts/bump-version.mjs <version | patch | minor | major> [--tag]
 *
 *   pnpm version:bump 0.0.2          # explicit version
 *   pnpm version:bump patch          # semver patch (0.0.1 → 0.0.2)
 *   pnpm version:bump minor          # semver minor (0.0.1 → 0.1.0)
 *   pnpm version:bump major          # semver major (0.0.1 → 1.0.0)
 *   pnpm version:bump 0.0.2 --tag    # also `git add + commit + tag`
 *
 * The `--tag` flag stages the changed files, commits with the message
 * `chore: bump to v<version>`, and creates an annotated git tag named
 * `v<version>`. It does NOT push — that's a deliberate hand-step so
 * a typo in the version doesn't trigger the release workflow before
 * you've reviewed the diff.
 *
 * After running with --tag:
 *
 *   git push && git push origin v<version>
 *
 * The tag push is what fires `.github/workflows/release.yml`.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

/**
 * Files to update + which strategy to use. JSON files use a regex on
 * `"version": "..."` (preserves formatting + comments-as-strings);
 * Cargo.toml uses a regex anchored to the `[package]` section so the
 * dependency-block `version = "..."` lines aren't matched.
 */
const FILES = [
  { path: 'package.json', kind: 'json' },
  { path: 'apps/desktop/package.json', kind: 'json' },
  { path: 'packages/lcars-ui/package.json', kind: 'json' },
  { path: 'apps/desktop/src-tauri/tauri.conf.json', kind: 'json' },
  { path: 'apps/desktop/src-tauri/Cargo.toml', kind: 'cargo-toml' },
];

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/;

function parseSemver(v) {
  const m = SEMVER_RE.exec(v);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? null };
}

function bumpSemver(current, kind) {
  const v = parseSemver(current);
  if (!v) throw new Error(`current version "${current}" is not semver`);
  switch (kind) {
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'major':
      return `${v.major + 1}.0.0`;
    default:
      throw new Error(`unknown bump kind: ${kind}`);
  }
}

async function readRootVersion() {
  const raw = await readFile(join(repoRoot, 'package.json'), 'utf8');
  const m = /"version"\s*:\s*"([^"]+)"/.exec(raw);
  if (!m) throw new Error('could not find "version" in root package.json');
  return m[1];
}

async function updateJsonFile(filePath, newVersion) {
  const abs = join(repoRoot, filePath);
  const raw = await readFile(abs, 'utf8');
  // Replace only the FIRST `"version": "..."` — package.json shape always
  // has version at the top level, so first match is correct. Replacing
  // all would clobber dependency versions if any happened to use the
  // same key shape.
  const updated = raw.replace(/("version"\s*:\s*)"[^"]+"/, `$1"${newVersion}"`);
  if (updated === raw) {
    throw new Error(`no "version" field found in ${filePath}`);
  }
  await writeFile(abs, updated);
}

async function updateCargoToml(filePath, newVersion) {
  const abs = join(repoRoot, filePath);
  const raw = await readFile(abs, 'utf8');
  // Anchor to the [package] section header so we don't touch
  // dependency `version = "..."` lines further down.
  const updated = raw.replace(
    /(\[package\][\s\S]*?\nversion\s*=\s*)"[^"]+"/,
    `$1"${newVersion}"`,
  );
  if (updated === raw) {
    throw new Error(
      `no [package] version found in ${filePath} — file structure may have changed`,
    );
  }
  await writeFile(abs, updated);
}

function gitRun(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    stdio: 'inherit',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: bump-version <version | patch | minor | major> [--tag]',
    );
    process.exit(1);
  }

  const arg = args[0];
  const tagFlag = args.includes('--tag');

  const current = await readRootVersion();
  let newVersion;
  if (['patch', 'minor', 'major'].includes(arg)) {
    newVersion = bumpSemver(current, arg);
  } else if (parseSemver(arg)) {
    newVersion = arg;
  } else {
    console.error(
      `Invalid version "${arg}". Expected semver (e.g. 0.0.2) or one of: patch, minor, major`,
    );
    process.exit(1);
  }

  if (newVersion === current) {
    console.error(
      `New version ${newVersion} is the same as current. Nothing to do.`,
    );
    process.exit(1);
  }

  console.log(`Bumping ${current} → ${newVersion}`);

  for (const { path, kind } of FILES) {
    try {
      if (kind === 'json') {
        await updateJsonFile(path, newVersion);
      } else if (kind === 'cargo-toml') {
        await updateCargoToml(path, newVersion);
      }
      console.log(`  ✓ ${path}`);
    } catch (err) {
      console.error(`  ✗ ${path}: ${err.message}`);
      process.exit(1);
    }
  }

  if (tagFlag) {
    console.log('\nStaging + committing + tagging…');
    gitRun(['add', ...FILES.map((f) => f.path)]);
    gitRun(['commit', '-m', `chore: bump to v${newVersion}`]);
    gitRun(['tag', '-a', `v${newVersion}`, '-m', `v${newVersion}`]);
    console.log(`\nTagged v${newVersion}. Push with:`);
    console.log(`  git push && git push origin v${newVersion}`);
  } else {
    console.log('\nDone. Review with: git diff');
    console.log('Then commit + tag manually:');
    console.log(`  git commit -am "chore: bump to v${newVersion}"`);
    console.log(`  git tag -a v${newVersion} -m "v${newVersion}"`);
    console.log(`  git push && git push origin v${newVersion}`);
    console.log('\nOr re-run with --tag to do all of that automatically.');
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
