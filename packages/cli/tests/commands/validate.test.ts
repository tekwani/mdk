import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const validateAppMock = vi.hoisted(() => vi.fn());
const validateWorkerMock = vi.hoisted(() => vi.fn());
const resolvePackageMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/app-package.js', () => ({ validateApp: validateAppMock }));
vi.mock('../../src/lib/worker-package.js', () => ({ validateWorker: validateWorkerMock }));
vi.mock('../../src/lib/runtime.js', () => ({ resolvePackageDir: resolvePackageMock }));

const { registerValidate } = await import('../../src/commands/validate.js');

function run(...args: string[]): Promise<Command> {
  const program = new Command();
  program.exitOverride();
  registerValidate(program);
  return program.parseAsync(['node', 'mdk', ...args]);
}

const goodApp = { errors: [], manifest: { id: 'io.tether.demo', version: '0.2.0', displayName: 'Demo', permissions: [{}] }, routes: 4 };

afterEach(() => {
  vi.restoreAllMocks();
  cleanupTmpDirs();
  validateAppMock.mockReset();
  validateWorkerMock.mockReset();
  resolvePackageMock.mockReset();
  process.exitCode = undefined;
});

// A project whose mdk.yaml declares the app `demo` and the worker `rig`.
function project(): string {
  const dir = makeTmpDir();
  writeFileSync(
    join(dir, 'mdk.yaml'),
    [
      'apiVersion: mdk/v1',
      'kind: Stack',
      'metadata:',
      '  name: t',
      'spec:',
      '  gateway:',
      '    port: 3000',
      '  workers:',
      '    - name: rig',
      '      package: "@your-org/mdk-worker-rig"',
      '  apps:',
      '    - name: demo',
      '      package: ./apps/demo',
      '',
    ].join('\n'),
  );
  resolvePackageMock.mockImplementation((projectDir: string, pkg: string) => join(projectDir, 'resolved', pkg));
  return dir;
}

describe('mdk validate app', () => {
  it('checks the package mdk.yaml declares under that name, and summarises it', async () => {
    const dir = project();
    validateAppMock.mockReturnValue(goodApp);
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', dir);
    expect(resolvePackageMock).toHaveBeenCalledWith(dir, './apps/demo');
    // The author's own package: validate also runs the UI contract check.
    expect(validateAppMock).toHaveBeenCalledWith(join(dir, 'resolved', './apps/demo'), { runUiContract: true });
    expect(stdout.mock.calls.join('')).toMatch(/Demo.*io\.tether\.demo 0\.2\.0.*valid app: 4 routes, 1 permission rule/);
    expect(process.exitCode).toBeUndefined();
  });

  it('reads mdk.yaml from the current directory by default, and counts no permissions', async () => {
    const dir = project();
    vi.spyOn(process, 'cwd').mockReturnValue(dir);
    validateAppMock.mockReturnValue({ ...goodApp, manifest: { ...goodApp.manifest, permissions: undefined }, routes: 1 });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo');
    expect(stdout.mock.calls.join('')).toMatch(/valid app: 1 route, 0 permission rules/);
  });

  it('refuses a name mdk.yaml does not declare, listing the ones it does', async () => {
    const dir = project();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', './apps/demo', '--dir', dir);
    expect(stderr.mock.calls.join('')).toMatch(/No app named "\.\/apps\/demo" in mdk\.yaml \(spec\.apps: demo\)/);
    expect(validateAppMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('reports a project without mdk.yaml', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', makeTmpDir());
    expect(stderr.mock.calls.join('')).toMatch(/No mdk\.yaml found/);
    expect(process.exitCode).toBe(1);
  });

  it('reports a declared package that is not installed', async () => {
    const dir = project();
    resolvePackageMock.mockImplementation(() => {
      throw new Error('Package "x" is not installed');
    });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', dir);
    expect(stderr.mock.calls.join('')).toContain('is not installed');
    expect(process.exitCode).toBe(1);
  });

  it('lists every error and exits 1', async () => {
    const dir = project();
    validateAppMock.mockReturnValue({ ...goodApp, errors: ['mdk-app.yaml: not found', 'package.json: not found'] });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', dir);
    expect(stderr.mock.calls.join('')).toMatch(/mdk-app\.yaml: not found[\s\S]*package\.json: not found/);
    expect(process.exitCode).toBe(1);
  });

  it('prints JSON with --json', async () => {
    const dir = project();
    validateAppMock.mockReturnValue({ ...goodApp, errors: ['x'] });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', dir, '--json');
    expect(JSON.parse(stdout.mock.calls.join(''))).toMatchObject({ ok: false, kind: 'app', name: 'demo', errors: ['x'] });
    expect(process.exitCode).toBe(1);
  });
});

describe('mdk validate worker', () => {
  it('summarises a valid worker', async () => {
    const dir = project();
    validateWorkerMock.mockReturnValue({ errors: [], name: 'rig', version: '0.1.0', telemetry: 1, commands: 2 });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'worker', 'rig', '--dir', dir);
    expect(resolvePackageMock).toHaveBeenCalledWith(dir, '@your-org/mdk-worker-rig');
    expect(stdout.mock.calls.join('')).toMatch(/rig.*0\.1\.0.*valid worker: 1 telemetry entry, 2 commands/);
  });

  it('fails with the errors', async () => {
    const dir = project();
    validateWorkerMock.mockReturnValue({ errors: ['mdk-contract.json: not found'], telemetry: 0, commands: 0 });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'worker', 'rig', '--dir', dir);
    expect(stderr.mock.calls.join('')).toContain('mdk-contract.json: not found');
    expect(process.exitCode).toBe(1);
  });

  it('checks a package directory directly with --path, reporting the package name', async () => {
    const dir = makeTmpDir();
    validateWorkerMock.mockReturnValue({ errors: [], name: 'your-org-rig', version: '0.1.0', telemetry: 1, commands: 1 });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'worker', '--path', dir, '--json');
    expect(validateWorkerMock).toHaveBeenCalledWith(dir);
    expect(resolvePackageMock).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.mock.calls.join(''))).toMatchObject({ ok: true, kind: 'worker', name: 'your-org-rig', path: dir });
    expect(process.exitCode).toBeUndefined();
  });

  it('refuses a name and --path together, and requires one of them', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'worker', 'rig', '--path', makeTmpDir());
    expect(stderr.mock.calls.join('')).toMatch(/name or --path, not both/);
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    await run('validate', 'worker');
    expect(stderr.mock.calls.join('')).toMatch(/--path <dir>/);
    expect(process.exitCode).toBe(1);
  });

  it('does not look up a worker name among the apps', async () => {
    const dir = project();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'worker', 'demo', '--dir', dir);
    expect(stderr.mock.calls.join('')).toMatch(/No worker named "demo" in mdk\.yaml \(spec\.workers: rig\)/);
    expect(process.exitCode).toBe(1);
  });
});
