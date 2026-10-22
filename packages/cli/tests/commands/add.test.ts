import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

const addPackageMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/add-package.js', () => ({ addPackage: addPackageMock }));

const { registerAdd } = await import('../../src/commands/add.js');

function run(...args: string[]): Promise<Command> {
  const program = new Command();
  program.exitOverride();
  registerAdd(program);
  return program.parseAsync(['node', 'mdk', 'add', ...args]);
}

afterEach(() => {
  vi.restoreAllMocks();
  addPackageMock.mockReset();
  process.exitCode = undefined;
});

describe('mdk add', () => {
  it('passes the source and options through and reports what changed', async () => {
    addPackageMock.mockReturnValue({
      ok: true,
      packageName: '@your-org/ops',
      reference: '@your-org/ops',
      instanceName: 'ops',
      stackFile: 'added',
      installed: false,
    });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('app', '@your-org/ops', '--dir', 'proj', '--name', 'ops', '--no-install');
    expect(addPackageMock).toHaveBeenCalledWith({ kind: 'app', source: '@your-org/ops', dir: 'proj', name: 'ops', install: false });
    const out = stdout.mock.calls.join('');
    expect(out).toContain('spec.apps');
    expect(out).toContain('@your-org/ops');
    expect(out).toContain('--no-install');
    expect(process.exitCode).toBeUndefined();
  });

  it('reports a worker, an existing entry and the missing device options', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    addPackageMock.mockReturnValue({ ok: true, packageName: 'w', reference: 'w', instanceName: 'w', stackFile: 'exists', needsDeviceOpts: true });
    await run('worker', 'owner/repo');
    expect(addPackageMock).toHaveBeenCalledWith(expect.objectContaining({ kind: 'worker', source: 'owner/repo', dir: '.', install: true }));
    const out = stdout.mock.calls.join('');
    expect(out).toContain('already listed');
    expect(out).toContain('devices[].opts');

    stdout.mockClear();
    addPackageMock.mockReturnValue({ ok: true, packageName: 'w', reference: 'w', instanceName: 'w', stackFile: 'error' });
    await run('worker', 'w');
    expect(stdout.mock.calls.join('')).toContain('yourself');
  });

  it('fails when another package already holds the name, and leaves mdk.yaml alone', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    addPackageMock.mockReturnValue({
      ok: false,
      message: 'spec.apps already has an app named "ops" with another package; mdk.yaml was not changed. package.json was restored.',
      stackFile: 'name-taken',
    });
    await run('app', '@your-org/ops');
    expect(stderr.mock.calls.join('')).toContain('spec.apps already has an app named "ops" with another package');
    expect(stdout.mock.calls.join('')).not.toContain('Added app');
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('says Updated, not Added, for an app mdk.yaml already lists', async () => {
    addPackageMock.mockReturnValue({ ok: true, packageName: '@your-org/ops', reference: '@your-org/ops', instanceName: 'ops', stackFile: 'exists', installed: true });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('app', '@your-org/ops');
    const out = stdout.mock.calls.join('');
    expect(out).toContain('Updated app');
    expect(out).toContain('already listed');
  });

  it('names the package.json dependency when npm ran', async () => {
    addPackageMock.mockReturnValue({
      ok: true,
      packageName: '@your-org/ops',
      reference: '@your-org/ops',
      instanceName: 'ops',
      stackFile: 'added',
      installed: true,
    });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('app', '@your-org/ops');
    const out = stdout.mock.calls.join('');
    expect(out).toMatch(/package\.json dependency @your-org\/ops/);
    expect(out).not.toContain('--no-install');
    expect(out).toContain('mdk run app ops');
  });

  it('exits 1 with just the message when there is no list of errors', async () => {
    addPackageMock.mockReturnValue({ ok: false, message: 'npm install exited with code 1.' });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('worker', 'x');
    expect(stderr.mock.calls.join('')).toBe('error: npm install exited with code 1.\n');
    expect(process.exitCode).toBe(1);
  });

  it('prints the errors and exits 1 on failure', async () => {
    addPackageMock.mockReturnValue({ ok: false, message: 'not valid', errors: ['mdk-app.yaml: not found'] });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('app', 'x');
    expect(stderr.mock.calls.join('')).toMatch(/not valid[\s\S]*mdk-app\.yaml: not found/);
    expect(process.exitCode).toBe(1);
  });
});
