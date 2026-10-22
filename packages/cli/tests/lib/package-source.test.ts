import { describe, expect, it } from 'vitest';
import { parseSource } from '../../src/lib/package-source.js';

describe('parseSource', () => {
  it('reads npm names, scopes, versions and subpaths', () => {
    expect(parseSource('mdk-app-demo')).toEqual({ kind: 'npm', installSpec: 'mdk-app-demo', packageName: 'mdk-app-demo' });
    expect(parseSource('@your-org/ops@1.2.3')).toEqual({ kind: 'npm', installSpec: '@your-org/ops@1.2.3', packageName: '@your-org/ops' });
    expect(parseSource('@your-org/ops/apps/site')).toEqual({
      kind: 'npm',
      installSpec: '@your-org/ops',
      packageName: '@your-org/ops',
      subpath: 'apps/site',
    });
    expect(parseSource('@your-org/ops@^2/apps/site')).toMatchObject({ installSpec: '@your-org/ops@^2', subpath: 'apps/site' });
    expect(parseSource('pkg@latest/sub')).toMatchObject({ kind: 'npm', installSpec: 'pkg@latest', subpath: 'sub' });
  });

  it('reads every GitHub form', () => {
    for (const raw of [
      'github:owner/repo#v1',
      'owner/repo#v1',
      'https://github.com/owner/repo#v1',
      'https://github.com/owner/repo.git#v1',
      'git+https://github.com/owner/repo.git#v1',
    ]) {
      expect(parseSource(raw)).toEqual({ kind: 'github', installSpec: 'github:owner/repo#v1' });
    }
    expect(parseSource('  owner/repo ').installSpec).toBe('github:owner/repo');
  });

  it('rejects what is neither', () => {
    expect(() => parseSource('')).toThrow(/Give a package source/);
    expect(() => parseSource('github:nope')).toThrow(/not a valid GitHub source/);
    expect(() => parseSource('@scope')).toThrow(/not a valid npm package/);
    expect(() => parseSource('@/x')).toThrow(/not a valid npm package/);
    expect(() => parseSource('Bad Name')).toThrow(/not a valid npm package name/);
    expect(() => parseSource('pkg@')).toThrow(/empty version/);
    expect(() => parseSource('pkg@1 2')).toThrow(/cannot take as one argument/);
    expect(() => parseSource('owner/repo#$(id)')).toThrow(/not a valid package subpath/);
    expect(() => parseSource('@your-org/ops/../../etc')).toThrow(/not a valid package subpath/);
  });

  it('refuses a path with a pointer to mdk.yaml, instead of reading ../x as a GitHub repo', () => {
    for (const raw of ['../my-app', './apps/ops', '/srv/apps/ops', 'file:../x', '~/apps/x']) {
      expect(() => parseSource(raw), raw).toThrow(/is a path\. `mdk add` installs from npm or GitHub/);
    }
  });
});
