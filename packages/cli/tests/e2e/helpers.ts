import { spawnSync, type ChildProcess, type SpawnSyncReturns } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Shared by the end-to-end suites: how to run the CLI, pick ports and wait for a stack.

export const CLI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * A scratch project inside the package, so scaffolded apps and workers resolve @tetherto/* from
 * the monorepo's node_modules (no registry needed). Matches the package's `mdk-try-*` ignore rule.
 */
export const projectDir = (suite: string): string => join(CLI_ROOT, `mdk-try-${suite}-${process.pid}`);

// `node --import tsx` runs the CLI source directly, in one process (a `tsx` wrapper would sit between
// us and the CLI and swallow its exit status).
export const CLI = ['--import', 'tsx', join(CLI_ROOT, 'src', 'index.ts')];

export const env = { ...process.env, NO_COLOR: '1' };

/** Default limit for one synchronous command: long enough for the CLI, short of a hung suite. */
export const COMMAND_TIMEOUT = 30_000;

export function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolvePort(port));
    });
  });
}

/**
 * Runs `mdk <args>` in `cwd` and waits for it. `spawnSync` blocks the event loop, so Vitest's own
 * test timeout cannot interrupt it: the `timeout` + SIGKILL turns a command that hangs (a refused
 * duplicate, a stuck install) into a failure instead.
 */
export const cliRunner =
  (cwd: string) =>
  (args: string[], timeout = COMMAND_TIMEOUT): SpawnSyncReturns<string> =>
    spawnSync(process.execPath, [...CLI, ...args], { cwd, encoding: 'utf8', env, timeout, killSignal: 'SIGKILL' });

/** Runs `npm <args>` in `cwd`, with the same timeout rule as {@link cliRunner}. */
export const npm = (cwd: string, args: string[], timeout = COMMAND_TIMEOUT): SpawnSyncReturns<string> =>
  spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd,
    encoding: 'utf8',
    env,
    timeout,
    killSignal: 'SIGKILL',
    shell: process.platform === 'win32',
  });

/** A long-running `mdk run …` and everything it has printed so far. */
export interface Running {
  proc: ChildProcess;
  output: () => string;
}

/**
 * Polls `condition` until it holds or `ms` passes. On a timeout the error carries `diagnostics()`,
 * typically the output of the processes under test.
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  what: string,
  diagnostics: () => string = () => '',
  ms = 90_000,
): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Timed out waiting for ${what}.\n${diagnostics()}`);
}
