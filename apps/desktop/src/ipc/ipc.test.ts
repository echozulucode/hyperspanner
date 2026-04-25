import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HyperspannerError,
  toHyperspannerError,
} from './errors';
import { __setInvokeForTests, invoke } from './invoke';
import type { InvokeFn } from './invoke';
import { readFileBytes, readTextFile } from './fs';
import { hashText, hashFile } from './hash';

/**
 * IPC layer — cover:
 *   - `toHyperspannerError` normalizes every rejection shape Tauri can
 *     throw at us (payload object, bare string, Error instance, unknown).
 *   - Unknown `kind` strings collapse to `"unknown"` instead of leaking
 *     an unchecked string into the typed union.
 *   - `invoke` routes rejections through the normalizer so callers always
 *     receive `HyperspannerError`.
 *   - `readFileBytes` / `readTextFile` forward their arguments to the
 *     expected Tauri command names with the expected arg shape.
 *
 * All `invoke` calls are routed through the test transport via
 * `__setInvokeForTests` — no real Tauri runtime is required.
 */

describe('toHyperspannerError', () => {
  it('passes through an existing HyperspannerError', () => {
    const original = new HyperspannerError('path_not_found', 'nope');
    expect(toHyperspannerError(original)).toBe(original);
  });

  it('rehydrates a Rust-shaped payload', () => {
    const err = toHyperspannerError({
      kind: 'file_too_large',
      message: 'file too large: 99 bytes exceeds limit of 10 bytes',
    });
    expect(err).toBeInstanceOf(HyperspannerError);
    expect(err.kind).toBe('file_too_large');
    expect(err.message).toBe('file too large: 99 bytes exceeds limit of 10 bytes');
  });

  it('collapses unknown kind strings to "unknown"', () => {
    const err = toHyperspannerError({
      kind: 'some_future_variant_we_have_not_mirrored',
      message: 'hi',
    });
    expect(err.kind).toBe('unknown');
    expect(err.message).toBe('hi');
  });

  it('wraps a bare string rejection', () => {
    const err = toHyperspannerError('command not found: missing');
    expect(err.kind).toBe('unknown');
    expect(err.message).toBe('command not found: missing');
  });

  it('wraps a plain Error instance', () => {
    const err = toHyperspannerError(new Error('boom'));
    expect(err.kind).toBe('unknown');
    expect(err.message).toBe('boom');
  });

  it('stringifies a weird payload as a last resort', () => {
    const err = toHyperspannerError({ unexpected: 42 });
    expect(err.kind).toBe('unknown');
    // JSON.stringify of the object, rather than "[object Object]".
    expect(err.message).toContain('"unexpected":42');
  });
});

describe('invoke transport', () => {
  afterEach(() => {
    __setInvokeForTests(null);
  });

  it('returns the resolved value on success', async () => {
    // Cast through `unknown` because `InvokeFn` is generic `<T>(...) =>
    // Promise<T>` — a concrete `() => Promise<string>` arrow can't satisfy
    // an arbitrary caller-picked `T`. Real Tauri invoke has the same hole
    // at the type system level; the wire is untyped.
    __setInvokeForTests(((async () => 'pong') as unknown) as InvokeFn);
    const result = await invoke<string>('ping');
    expect(result).toBe('pong');
  });

  it('normalizes a rejected payload into HyperspannerError', async () => {
    __setInvokeForTests(async () => {
      throw { kind: 'path_not_found', message: 'path does not exist: /x' };
    });
    await expect(invoke('read_file_bytes', { path: '/x' })).rejects.toMatchObject({
      kind: 'path_not_found',
      message: 'path does not exist: /x',
    });
  });

  it('normalizes a bare string rejection', async () => {
    __setInvokeForTests(async () => {
      throw 'command X not found';
    });
    const err: unknown = await invoke('X').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HyperspannerError);
    // Narrow for TS — the expect above already asserts the runtime shape,
    // so we're not masking a failure mode; the `if` is a compile-time
    // device.
    if (err instanceof HyperspannerError) {
      expect(err.kind).toBe('unknown');
    }
  });
});

describe('fs wrappers', () => {
  let spy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    spy = vi.fn();
    __setInvokeForTests(spy);
  });

  afterEach(() => {
    __setInvokeForTests(null);
  });

  it('readFileBytes forwards path + maxBytes under the expected command', async () => {
    spy.mockResolvedValueOnce({ bytes: [1, 2, 3], size: 3, path: '/a' });
    const out = await readFileBytes({ path: '/a', maxBytes: 128 });
    expect(spy).toHaveBeenCalledWith('read_file_bytes', {
      path: '/a',
      maxBytes: 128,
    });
    expect(out).toEqual({ bytes: [1, 2, 3], size: 3, path: '/a' });
  });

  it('readFileBytes omits maxBytes when not provided (serializes as undefined)', async () => {
    spy.mockResolvedValueOnce({ bytes: [], size: 0, path: '/b' });
    await readFileBytes({ path: '/b' });
    // We pass `maxBytes: undefined` through — Tauri's invoke treats
    // undefined args as absent, so Rust sees `max_bytes: None`. Asserting
    // the call shape keeps us honest that we aren't accidentally passing
    // a `0` or empty-string default.
    expect(spy).toHaveBeenCalledWith('read_file_bytes', {
      path: '/b',
      maxBytes: undefined,
    });
  });

  it('readTextFile forwards path + encoding + maxBytes', async () => {
    spy.mockResolvedValueOnce({
      text: 'ok',
      size: 2,
      path: '/c',
      encoding: 'utf-8',
    });
    const out = await readTextFile({
      path: '/c',
      encoding: 'utf-8',
      maxBytes: 4096,
    });
    expect(spy).toHaveBeenCalledWith('read_text_file', {
      path: '/c',
      encoding: 'utf-8',
      maxBytes: 4096,
    });
    expect(out.text).toBe('ok');
    expect(out.encoding).toBe('utf-8');
  });

  it('readTextFile surfaces a Rust InvalidUtf8 error as a typed HyperspannerError', async () => {
    spy.mockRejectedValueOnce({
      kind: 'invalid_utf8',
      message: 'file contains invalid UTF-8 starting at byte 17',
    });
    const err = await readTextFile({ path: '/d' }).catch((e) => e);
    expect(err).toBeInstanceOf(HyperspannerError);
    expect(err.kind).toBe('invalid_utf8');
  });
});

describe('hash wrappers', () => {
  let spy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    spy = vi.fn();
    __setInvokeForTests(spy);
  });

  afterEach(() => {
    __setInvokeForTests(null);
  });

  it('hashText forwards text + algorithm under the hash_text command', async () => {
    spy.mockResolvedValueOnce({
      digest: 'abc123',
      algorithm: 'sha256',
      size: 11,
    });
    const out = await hashText({ text: 'hello world', algorithm: 'sha256' });
    expect(spy).toHaveBeenCalledWith('hash_text', {
      text: 'hello world',
      algorithm: 'sha256',
    });
    expect(out.digest).toBe('abc123');
    expect(out.algorithm).toBe('sha256');
    expect(out.size).toBe(11);
  });

  it('hashFile forwards path + algorithm + maxBytes under the hash_file command', async () => {
    spy.mockResolvedValueOnce({
      digest: 'def456',
      algorithm: 'md5',
      size: 1024,
    });
    const out = await hashFile({
      path: '/tmp/data.bin',
      algorithm: 'md5',
      maxBytes: 65536,
    });
    expect(spy).toHaveBeenCalledWith('hash_file', {
      path: '/tmp/data.bin',
      algorithm: 'md5',
      maxBytes: 65536,
    });
    expect(out.digest).toBe('def456');
  });

  it('hashFile omits maxBytes when not provided (serializes as undefined)', async () => {
    spy.mockResolvedValueOnce({
      digest: 'ghi789',
      algorithm: 'sha1',
      size: 2048,
    });
    await hashFile({ path: '/tmp/file.txt', algorithm: 'sha1' });
    expect(spy).toHaveBeenCalledWith('hash_file', {
      path: '/tmp/file.txt',
      algorithm: 'sha1',
      maxBytes: undefined,
    });
  });

  it('unsupported_algorithm rejection rehydrates as a typed HyperspannerError', async () => {
    spy.mockRejectedValueOnce({
      kind: 'unsupported_algorithm',
      message: 'algorithm blake2 is not supported',
    });
    const err = await hashText({
      text: 'test',
      algorithm: 'sha256',
    }).catch((e) => e);
    expect(err).toBeInstanceOf(HyperspannerError);
    expect(err.kind).toBe('unsupported_algorithm');
    expect(err.message).toBe('algorithm blake2 is not supported');
  });
});
