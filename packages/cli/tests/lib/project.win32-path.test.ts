import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

// `path.relative()` returns an absolute `to` path when `from`/`to` are on
// different drives — win32-only behaviour that cannot occur on the POSIX
// runners this suite runs on. Force it here so `addFileDependency`'s fallback
// is exercised regardless of platform.
const ABS_CROSS_DRIVE = '/simulated/D/checkouts/mdk-worker-antminer';
vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:path')>();
  return {
    ...actual,
    relative: (from: string, to: string) =>
      to === ABS_CROSS_DRIVE ? ABS_CROSS_DRIVE : actual.relative(from, to),
  };
});

const { addFileDependency, ensureProjectManifest } = await import('../../src/lib/project.js');

afterEach(() => cleanupTmpDirs());

describe('addFileDependency (cross-drive fallback)', () => {
  it('falls back to the absolute path when path.relative() returns one', () => {
    const dir = makeTmpDir();
    ensureProjectManifest(dir, 'stack');
    addFileDependency(dir, '@tetherto/mdk-worker-antminer', ABS_CROSS_DRIVE);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@tetherto/mdk-worker-antminer']).toBe(`file:${ABS_CROSS_DRIVE}`);
  });
});
