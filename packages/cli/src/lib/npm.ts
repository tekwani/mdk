import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isFileLinkedFromProject, isWorkspaceMember } from './project.js';

export interface InstallResult {
  ok: boolean;
  /** Skipped when there is nothing to install (no package.json) or `run: false`. */
  skipped?: boolean;
  message?: string;
}

export interface ScaffoldInstall extends InstallResult {
  /** The directory npm actually ran in — the workspace root, or the package. */
  dir: string;
}

/** The npm executable name for the current platform. */
export function npmBin(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * Whether npm must be spawned through a shell. Node refuses to spawn a `.cmd`
 * file without one on Windows (EINVAL since the CVE-2024-27980 fix), so win32
 * needs `shell: true`. A shell joins argv unescaped, which is why every caller
 * passes fixed arguments or specs checked against `INSTALL_SPEC_RE` only.
 */
export function npmNeedsShell(): boolean {
  return process.platform === 'win32';
}

/** A bare or scoped npm package name — nothing a shell would interpret. */
export const NPM_PACKAGE_RE = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

/**
 * What `installPackages` hands to `npm install`: a package name with an optional
 * `@version` / `@range`, or `github:owner/repo[#ref]`. No quote, `%`, `&`, `;`,
 * `$`, space or newline can appear, so a spec is safe to pass through a shell
 * once double-quoted (see `shellArg`); quoting keeps a range's `^ < > |` literal.
 */
export const INSTALL_SPEC_RE =
  /^(?:(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:@[0-9A-Za-z.~^*<>=|+-]+)?|github:[A-Za-z0-9][\w.-]*\/[\w.-]+(?:#[\w./-]+)?)$/;

/** A checked spec as one argument: quoted when npm runs through a shell. */
function shellArg(spec: string): string {
  return npmNeedsShell() ? `"${spec}"` : spec;
}

/**
 * Runs `npm install` in `dir` (best-effort). Streams npm's output so progress is
 * visible. Never throws: a missing `package.json`, a missing `npm`, or a
 * non-zero exit is reported via the result so the scaffold still succeeds and
 * the user can install manually.
 */
export function installDeps(dir: string, run = true, extraArgs: string[] = []): InstallResult {
  if (!run) return { ok: true, skipped: true, message: 'install skipped (--no-install)' };
  if (!existsSync(join(dir, 'package.json'))) {
    return { ok: true, skipped: true, message: 'no package.json — nothing to install' };
  }

  const res = spawnSync(npmBin(), ['install', ...extraArgs], {
    cwd: dir,
    stdio: 'inherit',
    env: process.env,
    shell: npmNeedsShell(),
  });

  if (res.error) {
    const missing = (res.error as NodeJS.ErrnoException).code === 'ENOENT';
    return {
      ok: false,
      message: missing
        ? 'npm was not found on PATH — install dependencies manually.'
        : `npm install failed to start: ${res.error.message}`,
    };
  }
  if (typeof res.status === 'number' && res.status !== 0) {
    return { ok: false, message: `npm install exited with code ${res.status}.` };
  }
  return { ok: true };
}

/**
 * Adds one or more packages to `dir`'s `dependencies` and installs them
 * (`npm install <pkg>...`), so the runtime can later resolve them from the
 * project's `node_modules`. Same best-effort, never-throw contract as
 * `installDeps`: a missing `npm`, a missing manifest, or a non-zero exit is
 * reported via the result rather than thrown. No-ops when `packages` is empty.
 */
export function installPackages(dir: string, packages: string[], run = true, extraArgs: string[] = []): InstallResult {
  if (!run) return { ok: true, skipped: true, message: 'install skipped (--no-install)' };
  if (packages.length === 0) {
    return { ok: true, skipped: true, message: 'no packages to install' };
  }
  if (!existsSync(join(dir, 'package.json'))) {
    return { ok: false, message: 'no package.json — run `mdk onboard` first' };
  }

  const invalid = packages.find((spec) => !INSTALL_SPEC_RE.test(spec));
  if (invalid) return { ok: false, message: `refusing to install "${invalid}": not a valid npm package or GitHub spec` };

  const res = spawnSync(npmBin(), ['install', ...extraArgs, ...packages.map(shellArg)], {
    cwd: dir,
    stdio: 'inherit',
    env: process.env,
    shell: npmNeedsShell(),
  });

  if (res.error) {
    const missing = (res.error as NodeJS.ErrnoException).code === 'ENOENT';
    return {
      ok: false,
      message: missing
        ? 'npm was not found on PATH — install the plugins manually.'
        : `npm install failed to start: ${res.error.message}`,
    };
  }
  if (typeof res.status === 'number' && res.status !== 0) {
    return { ok: false, message: `npm install exited with code ${res.status}.` };
  }
  return { ok: true };
}

/**
 * Installs dependencies for a freshly scaffolded component. When the package is
 * a workspace member or already declared as a `file:` dep of the project root,
 * npm must run at the project root so the symlink lands in the project's
 * `node_modules`. Everything else installs in its own directory.
 */
export function installScaffold(
  projectDir: string,
  packageDir: string,
  run = true,
): ScaffoldInstall {
  const atRoot =
    isWorkspaceMember(projectDir, packageDir) || isFileLinkedFromProject(projectDir, packageDir);
  const dir = atRoot ? projectDir : packageDir;
  return { ...installDeps(dir, run), dir };
}
