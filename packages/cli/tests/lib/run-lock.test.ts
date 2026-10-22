import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { acquireRunLocks, isAlive, lockHolder, runLockFile } from '../../src/lib/run-lock.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(cleanupTmpDirs);

/** A pid no process has right now. */
function deadPid(): number {
  let pid = 4_000_000;
  while (isAlive(pid)) pid++;
  return pid;
}

function hold(dir: string, file: string, pid: number): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, String(pid));
  expect(existsSync(join(dir, '.mdk', 'run'))).toBe(true);
}

describe('run locks', () => {
  it('names one lock file per component under .mdk/run', () => {
    expect(runLockFile('/p', { kind: 'kernel' })).toBe('/p/.mdk/run/kernel.pid');
    expect(runLockFile('/p', { kind: 'worker', name: 'rig' })).toBe('/p/.mdk/run/worker-rig.pid');
    expect(runLockFile('/p', { kind: 'app', name: 'ops' })).toBe('/p/.mdk/run/app-ops.pid');
  });

  it('refuses a name that is not a single safe path segment', () => {
    expect(() => runLockFile('/p', { kind: 'app', name: '../../x' })).toThrow(/Invalid app name/);
  });

  it('writes this pid, reports it as the holder, and frees the file on release', () => {
    const dir = makeTmpDir();
    const lock = acquireRunLocks(dir, [{ kind: 'kernel' }, { kind: 'app', name: 'ops' }]);
    expect(readFileSync(runLockFile(dir, { kind: 'kernel' }), 'utf8')).toBe(String(process.pid));
    expect(lockHolder(dir, { kind: 'app', name: 'ops' })).toBe(process.pid);
    lock.release();
    expect(existsSync(runLockFile(dir, { kind: 'kernel' }))).toBe(false);
    expect(lockHolder(dir, { kind: 'app', name: 'ops' })).toBeNull();
  });

  it('refuses a component another live process is running, and takes none of the others', () => {
    const dir = makeTmpDir();
    const appLock = runLockFile(dir, { kind: 'app', name: 'ops' });
    hold(dir, appLock, process.ppid);

    expect(() => acquireRunLocks(dir, [{ kind: 'kernel' }, { kind: 'app', name: 'ops' }])).toThrow(
      new RegExp(`App "ops" is already running for this project \\(pid ${process.ppid}\\)`),
    );
    expect(existsSync(runLockFile(dir, { kind: 'kernel' })), 'the kernel lock taken first is released').toBe(false);
    expect(readFileSync(appLock, 'utf8')).toBe(String(process.ppid));
  });

  it('names the Kernel in its own words', () => {
    const dir = makeTmpDir();
    hold(dir, runLockFile(dir, { kind: 'kernel' }), process.ppid);
    expect(() => acquireRunLocks(dir, [{ kind: 'kernel' }])).toThrow(/^The kernel is already running/);
  });

  it('takes over a lock whose process is gone', () => {
    const dir = makeTmpDir();
    const file = runLockFile(dir, { kind: 'worker', name: 'rig' });
    hold(dir, file, deadPid());
    expect(lockHolder(dir, { kind: 'worker', name: 'rig' })).toBeNull();
    acquireRunLocks(dir, [{ kind: 'worker', name: 'rig' }]).release();
    expect(existsSync(file)).toBe(false);
  });

  it('treats an unreadable or garbage lock file as free', () => {
    const dir = makeTmpDir();
    const file = runLockFile(dir, { kind: 'kernel' });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, 'not a pid');
    expect(lockHolder(dir, { kind: 'kernel' })).toBeNull();
    expect(isAlive(0)).toBe(false);
    expect(isAlive(-1)).toBe(false);
  });

  it('does not remove a lock another process took over after this one released it', () => {
    const dir = makeTmpDir();
    const lock = acquireRunLocks(dir, [{ kind: 'kernel' }]);
    const file = runLockFile(dir, { kind: 'kernel' });
    writeFileSync(file, String(process.ppid));
    lock.release();
    expect(readFileSync(file, 'utf8')).toBe(String(process.ppid));
  });

  it('lets exactly one of several processes racing over a stale lock take it, and tells the rest plainly', async () => {
    const dir = makeTmpDir();
    hold(dir, runLockFile(dir, { kind: 'app', name: 'ops' }), deadPid());
    const script = [
      `import { acquireRunLocks } from ${JSON.stringify(join(import.meta.dirname, '..', '..', 'src', 'lib', 'run-lock.ts'))};`,
      'try {',
      `  acquireRunLocks(${JSON.stringify(dir)}, [{ kind: 'app', name: 'ops' }]);`,
      "  console.log('ok');",
      '  setTimeout(() => {}, 1500);',
      '} catch (error) { console.log(error.message); }',
    ].join('\n');
    const outputs = await Promise.all(
      Array.from({ length: 8 }, () => new Promise<string>((resolveRun) => {
        const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script]);
        let out = '';
        child.stdout.on('data', (chunk) => (out += chunk));
        child.on('exit', () => resolveRun(out.trim()));
      })),
    );
    expect(outputs.filter((o) => o === 'ok')).toHaveLength(1);
    for (const other of outputs.filter((o) => o !== 'ok')) {
      expect(other).toMatch(/App "ops" is (already running|being started)/);
    }
  }, 30_000);

  it('clears a takeover guard whose process is gone', () => {
    const dir = makeTmpDir();
    const file = runLockFile(dir, { kind: 'kernel' });
    hold(dir, file, deadPid());
    writeFileSync(`${file}.takeover`, String(deadPid()));
    acquireRunLocks(dir, [{ kind: 'kernel' }]).release();
    expect(existsSync(`${file}.takeover`)).toBe(false);
  });

  it('frees its locks when the process exits', () => {
    const dir = makeTmpDir();
    const script = [
      `import { acquireRunLocks, runLockFile } from ${JSON.stringify(join(import.meta.dirname, '..', '..', 'src', 'lib', 'run-lock.ts'))};`,
      `acquireRunLocks(${JSON.stringify(dir)}, [{ kind: 'app', name: 'ops' }]);`,
      `console.log(runLockFile(${JSON.stringify(dir)}, { kind: 'app', name: 'ops' }));`,
    ].join('\n');
    const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' });
    expect(child.status, child.stderr).toBe(0);
    const file = child.stdout.trim();
    expect(file).toBe(runLockFile(dir, { kind: 'app', name: 'ops' }));
    expect(existsSync(dirname(file)), 'the child took the lock').toBe(true);
    expect(existsSync(file), 'and removed it on exit').toBe(false);
  });
});
