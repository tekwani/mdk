import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkoutRoot } from '../../src/lib/checkout.js';
import { readProjectEnv, writeProjectEnv } from '../../src/lib/env-file.js';
import { isInside, NAME_RE, parseOrg } from '../../src/lib/names.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(cleanupTmpDirs);

describe('names', () => {
  it('NAME_RE admits single safe segments only', () => {
    expect(NAME_RE.test('my-stack.v2_x')).toBe(true);
    for (const bad of ['..', '../x', 'a/b', 'a\\b', '.x', 'X', "a'b", 'a b', '']) {
      expect(NAME_RE.test(bad)).toBe(false);
    }
  });

  it('parseOrg strips one @ and validates the scope', () => {
    expect(parseOrg(undefined)).toEqual({ ok: true });
    expect(parseOrg('')).toEqual({ ok: true });
    expect(parseOrg('@your-org')).toEqual({ ok: true, org: 'your-org' });
    expect(parseOrg('your-org.io')).toEqual({ ok: true, org: 'your-org.io' });
    for (const bad of ['your-org\nid: x', 'a/b', 'YourOrg', '@@your-org', '-x']) {
      expect(parseOrg(bad).ok).toBe(false);
    }
  });

  it('isInside rejects paths that escape the parent', () => {
    expect(isInside('/p/apps', '/p/apps/x')).toBe(true);
    expect(isInside('/p/apps', '/p/apps')).toBe(true);
    expect(isInside('/p/apps', '/p/apps/../x')).toBe(false);
    expect(isInside('/p/apps', '/p/appsx')).toBe(false);
    expect(isInside('/p/apps', '/etc')).toBe(false);
  });
});

describe('checkoutRoot', () => {
  it('accepts only the <root>/packages/cli layout', () => {
    expect(checkoutRoot(join('/repo', 'packages', 'cli'))).toBe('/repo');
    expect(checkoutRoot('/x/node_modules/@tetherto/mdk-cli')).toBeNull();
    expect(checkoutRoot('/tmp/cli')).toBeNull();
  });
});

describe('project .env', () => {
  it('writes owner-only, upserts by name and round-trips awkward values', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, '.env'), 'KEEP=1\nMDK_A=old', 'utf8');
    writeProjectEnv(dir, { MDK_A: "it's", MDK_B: 'a`b\'c', MDK_C: '$1 # x' });
    expect(readProjectEnv(dir)).toEqual({ KEEP: '1', MDK_A: "it's", MDK_B: 'a`b\'c', MDK_C: '$1 # x' });
    expect(readFileSync(join(dir, '.env'), 'utf8').match(/^MDK_A=/gm)).toHaveLength(1);
    if (process.platform !== 'win32') expect(statSync(join(dir, '.env')).mode & 0o777).toBe(0o600);
  });

  it('refuses line breaks and bad names, and reads {} when absent', () => {
    const dir = makeTmpDir();
    expect(() => writeProjectEnv(dir, { MDK_A: 'a\nb' })).toThrow(/line break/);
    expect(() => writeProjectEnv(dir, { 'A=B': 'x' })).toThrow(/invalid environment variable name/);
    expect(readProjectEnv(dir)).toEqual({});
  });
});
