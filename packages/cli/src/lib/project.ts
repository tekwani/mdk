import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * Project scaffolding shared by `mdk onboard` and `mdk create` — the files that
 * describe the *project* rather than any one component.
 *
 * The emitted layout is role-grouped, mirroring MDK's own component model, so a
 * path in `mdk.yaml` says what it is:
 *
 *   mdk.yaml          the stack spec
 *   package.json      private root manifest (no `workspaces` key — path-backed
 *                     packages link via relative `file:` deps so `npm install`
 *                     works inside the project directory)
 *   workers/<name>/   worker plugins   (mdk create worker)
 *   plugins/<name>/   gateway plugins  (mdk create plugin)
 *   apps/dashboard/   the UI dashboard (mdk create dashboard)
 *   .mdk/             runtime state written by `mdk run` (gitignored)
 */

/** Component directories, relative to the project root. */
export const DIRS = {
  workers: 'workers',
  plugins: 'plugins',
  apps: 'apps',
  /** Canonical dashboard location — a stable path, unlike the app's package name. */
  dashboard: join('apps', 'dashboard'),
} as const;

/**
 * Historical workspace globs (`workers/*`, `plugins/*`). Kept for reading
 * pre-existing manifests that still declare them (`isWorkspaceMember`); new
 * projects never write a `workspaces` key — local scaffolds use `file:` deps.
 */
export const WORKSPACES = [`${DIRS.workers}/*`, `${DIRS.plugins}/*`];

export type FileAction = 'created' | 'updated' | 'present';

/** Coerces a stack name into a valid npm package name. */
function npmName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[-._]+$/g, '');
  return slug || 'mdk-stack';
}

/**
 * Ensures the project has a private root `package.json`. Creates one if absent
 * (no `workspaces` key — local packages are linked via `file:` dependencies).
 * An existing manifest is never modified (name, deps, scripts, or workspaces).
 */
export function ensureProjectManifest(targetDir: string, stackName: string): FileAction {
  const path = join(targetDir, 'package.json');

  if (!existsSync(path)) {
    const manifest = {
      name: npmName(stackName),
      version: '0.1.0',
      private: true,
      scripts: { dev: 'mdk run' },
    };
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return 'created';
  }

  // Existing manifest is the user's — never overwrite it, and never inject workspaces.
  return 'present';
}

/** The project's declared workspace globs (empty when it is not a workspace root). */
function readWorkspaces(targetDir: string): string[] {
  const path = join(targetDir, 'package.json');
  if (!existsSync(path)) return [];
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as { workspaces?: unknown };
    return Array.isArray(pkg.workspaces) ? pkg.workspaces.filter((w) => typeof w === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * True when `packageDir` is covered by one of the project's workspace globs —
 * i.e. a root `npm install` would actually install it. Only such components may
 * be installed from the root; anything else (the dashboard, which is
 * intentionally outside the workspaces) has to install in its own directory.
 */
export function isWorkspaceMember(targetDir: string, packageDir: string): boolean {
  const globs = readWorkspaces(targetDir);
  if (!globs.length) return false;

  const rel = relative(resolve(targetDir), resolve(packageDir));
  if (!rel || rel.startsWith('..')) return false;
  const segments = rel.split(sep);

  return globs.some((glob) => {
    const parts = glob.split('/');
    return (
      parts.length === segments.length && parts.every((p, i) => p === '*' || p === segments[i])
    );
  });
}

/**
 * True when the project root already declares a `file:` dependency — in
 * either `dependencies` or `devDependencies` — that points at `packageDir`, so
 * `npm install` must run at the project root to create the symlink the
 * runtime resolves from `node_modules`.
 */
export function isFileLinkedFromProject(targetDir: string, packageDir: string): boolean {
  const path = join(targetDir, 'package.json');
  if (!existsSync(path)) return false;
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.devDependencies, ...pkg.dependencies };
    const absPackage = resolve(packageDir);
    return Object.values(deps).some((spec) => {
      if (!spec.startsWith('file:')) return false;
      return resolve(targetDir, spec.slice('file:'.length)) === absPackage;
    });
  } catch {
    return false;
  }
}

/** Sets one `dependencies` entry in the project root manifest, if not already set. */
function setDependency(targetDir: string, packageName: string, versionSpec: string): void {
  const path = join(targetDir, 'package.json');
  if (!existsSync(path)) throw new Error('no package.json');

  const pkg = JSON.parse(readFileSync(path, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  if (!pkg.dependencies) pkg.dependencies = {};
  if (pkg.dependencies[packageName] === versionSpec) return;
  pkg.dependencies[packageName] = versionSpec;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

/**
 * Declares a `file:`-linked dependency pointing at `absPath`, written relative
 * to `targetDir`. Works for packages inside the project folder and for bundled
 * monorepo catalog checkouts outside it — never appends to a `workspaces`
 * array, and never writes bare `*` (that hits the registry when the project is
 * not a monorepo workspace member). `npm install` resolves the relative
 * `file:` specifier against the project root and symlinks it into
 * `node_modules/<packageName>`.
 */
export function addFileDependency(targetDir: string, packageName: string, absPath: string): void {
  const target = resolve(absPath);
  const rel = relative(resolve(targetDir), target);
  // `path.relative()` returns an absolute path when `targetDir` and `absPath`
  // are on different drives (Windows only) — fall back to the absolute path
  // rather than writing a `file:./C:/...` spec, which npm resolves under the
  // project dir and 404s.
  const posix = (isAbsolute(rel) ? target : rel).split(sep).join('/');
  const spec = isAbsolute(rel) || posix.startsWith('.') ? posix : `./${posix}`;
  setDependency(targetDir, packageName, `file:${spec}`);
}

/**
 * The stack name from `<dir>/mdk.yaml` (falling back to the directory name), or
 * null when there is no spec — i.e. when the directory is not an MDK project and
 * nothing should be scaffolded into it.
 */
export function readStackName(targetDir: string): string | null {
  const specPath = join(targetDir, 'mdk.yaml');
  if (!existsSync(specPath)) return null;
  try {
    const doc = parseYaml(readFileSync(specPath, 'utf8')) as { metadata?: { name?: string } };
    const name = doc?.metadata?.name?.trim();
    if (name) return name;
  } catch {
    /* fall through to the directory name */
  }
  return basename(resolve(targetDir));
}

const GITIGNORE_HEADER = '# MDK';
const GITIGNORE_BLOCK = [
  `${GITIGNORE_HEADER} runtime state — kernel/gateway stores, worker DBs, discovery keys`,
  '.mdk/',
  '',
  '# Dependencies & build output',
  'node_modules/',
  'dist/',
  'coverage/',
  '.vite/',
  '*.tsbuildinfo',
  '',
  '# Local environment (commit .env.example instead)',
  '.env',
  '.env.local',
  '*.log',
  '',
].join('\n');

/**
 * Ensures the project has a `.gitignore` covering MDK runtime state and the
 * build output of the components it scaffolds. Creates one if absent; if a
 * `.gitignore` already exists without the MDK block, appends it (never clobbers
 * user content).
 */
export function ensureProjectGitignore(targetDir: string): FileAction {
  const path = join(targetDir, '.gitignore');
  if (!existsSync(path)) {
    writeFileSync(path, GITIGNORE_BLOCK, 'utf8');
    return 'created';
  }
  const current = readFileSync(path, 'utf8');
  if (current.includes(GITIGNORE_HEADER) || current.includes('.mdk/')) return 'present';
  appendFileSync(path, `${current.endsWith('\n') ? '' : '\n'}\n${GITIGNORE_BLOCK}`, 'utf8');
  return 'updated';
}

export interface ReadmeOptions {
  stackName: string;
  /** Worker names from the spec, for the per-component run commands. */
  workerNames: string[];
  /** Dashboard path relative to the project root, when one was scaffolded. */
  dashboardDir?: string;
}

function runSection({ workerNames }: ReadmeOptions): string {
  const workers = workerNames.length
    ? workerNames.map((name) => `mdk run worker ${name}`)
    : ['mdk run worker <name>'];
  return [
    '```bash',
    'npm install   # once, links workers/ and plugins/',
    'mdk run       # boots Kernel + Gateway + workers together',
    '```',
    '',
    'Or run each component in its own terminal:',
    '',
    '```bash',
    'mdk run kernel',
    'mdk run gateway',
    ...workers,
    '```',
  ].join('\n');
}

/**
 * Writes a project README describing the emitted layout and how to run the
 * stack. Never overwrites an existing README.
 */
export function ensureProjectReadme(targetDir: string, opts: ReadmeOptions): FileAction {
  const path = join(targetDir, 'README.md');
  if (existsSync(path)) return 'present';

  const dashboard = opts.dashboardDir
    ? [
        '## Dashboard',
        '',
        '```bash',
        `cd ${opts.dashboardDir}`,
        'npm install',
        'npm run dev',
        '```',
        '',
        'It proxies `/auth`, `/api` and `/pub` to the Gateway, so start the stack first.',
        '',
        '',
      ].join('\n')
    : '';

  const content = `# ${opts.stackName}

An MDK stack — a Kernel, a Gateway and its Workers — described declaratively in
\`mdk.yaml\`. Edit that file to change ports, gateway plugins, workers or the
devices each worker manages.

## Layout

\`\`\`
mdk.yaml           the stack spec: ports, gateway plugins, workers, devices
workers/<name>/    worker plugins — device contract, handlers and a mock device
plugins/<name>/    gateway plugins — HTTP aggregation endpoints
apps/dashboard/    the UI dashboard (Vite app)
.mdk/              runtime state written by \`mdk run\` — disposable, gitignored
\`\`\`

Workers, plugins and bundled monorepo catalog packages are linked with relative
\`file:\` dependencies (no \`workspaces\` key). One \`npm install\` at the project
root wires them up so the Gateway can resolve its plugins. Component directories
appear as you add components.

## Run it

${runSection(opts)}

## Add components

\`\`\`bash
mdk create worker <name>      # scaffolds workers/<name> and registers it in mdk.yaml
mdk create dashboard          # scaffolds apps/dashboard
\`\`\`

${dashboard}## Runtime state

\`.mdk/\` holds the Kernel and Gateway stores, each worker's database and identity
keys, and the local discovery keys. Delete it to reset the stack — every
component then comes back with a new identity; it is never committed.
`;

  writeFileSync(path, content, 'utf8');
  return 'created';
}
