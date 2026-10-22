import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { describeDashboardApps, resolveAppDirs } from '../../src/lib/dashboard-apps.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(() => cleanupTmpDirs());

const writeApp = (dir: string, manifest = 'id: io.tether.x\nversion: 0.1.0\ndisplayName: X\n'): void => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'mdk-app.yaml'), manifest);
};

describe('resolveAppDirs', () => {
  it('resolves a local path against the project and an installed package from node_modules', () => {
    const dir = makeTmpDir();
    writeApp(join(dir, 'apps', 'local'));
    const installed = join(dir, 'node_modules', '@your-org', 'mdk-app-remote');
    writeApp(installed);
    writeFileSync(join(installed, 'package.json'), JSON.stringify({ name: '@your-org/mdk-app-remote', version: '0.1.0' }));

    expect(
      resolveAppDirs(dir, [
        { name: 'local', package: './apps/local', config: { a: 1 } },
        { name: 'remote', package: '@your-org/mdk-app-remote', config: {} },
      ]),
    ).toEqual([
      { name: 'local', dir: join(dir, 'apps', 'local') },
      { name: 'remote', dir: expect.stringMatching(/node_modules\/@your-org\/mdk-app-remote$/) },
    ]);
  });

  it('names the app and the fix when the package is missing or is not an app', () => {
    const dir = makeTmpDir();
    expect(() => resolveAppDirs(dir, [{ name: 'a', package: './apps/a', config: {} }])).toThrow(
      /App "a": Package path "\.\/apps\/a" does not exist/,
    );
    expect(() => resolveAppDirs(dir, [{ name: 'b', package: 'not-a-real-app-xyz', config: {} }])).toThrow(
      /App "b".*not installed[\s\S]*npm install not-a-real-app-xyz/,
    );
    mkdirSync(join(dir, 'apps', 'c'), { recursive: true });
    expect(() => resolveAppDirs(dir, [{ name: 'c', package: './apps/c', config: {} }])).toThrow(/has no mdk-app\.yaml/);
  });
});

describe('describeDashboardApps', () => {
  it("reads each app's identity from its mdk-app.yaml, under the name it was installed as", () => {
    const dir = makeTmpDir();
    writeApp(join(dir, 'apps', 'sentinel'), 'id: io.tether.sentinel\nversion: 0.2.0\ndisplayName: Sentinel\n');

    expect(describeDashboardApps(dir, [{ name: 'watch', package: './apps/sentinel', config: {} }])).toEqual([
      {
        name: 'watch',
        id: 'io.tether.sentinel',
        version: '0.2.0',
        displayName: 'Sentinel',
        apiBase: '/apps/watch',
        dir: join(dir, 'apps', 'sentinel'),
      },
    ]);
  });

  it('returns no apps for a stack that declares none', () => {
    expect(describeDashboardApps(makeTmpDir(), [])).toEqual([]);
  });

  it('names the app and the missing field when the manifest is incomplete', () => {
    const dir = makeTmpDir();
    writeApp(join(dir, 'apps', 'half'), 'id: io.tether.half\nversion: 0.1.0\n');
    expect(() => describeDashboardApps(dir, [{ name: 'half', package: './apps/half', config: {} }])).toThrow(
      /App "half": mdk-app\.yaml is missing "displayName"/,
    );
  });

  it('names the app when its manifest is not valid YAML', () => {
    const dir = makeTmpDir();
    writeApp(join(dir, 'apps', 'bad'), 'id: [unclosed\n');
    expect(() => describeDashboardApps(dir, [{ name: 'bad', package: './apps/bad', config: {} }])).toThrow(
      /App "bad": mdk-app\.yaml:/,
    );
  });
});
