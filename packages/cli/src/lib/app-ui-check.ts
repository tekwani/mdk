import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The bare imports a dashboard lends to the app UIs it loads (import map), so
 * the only ones an app's built `ui/` may leave unresolved. A copy of
 * `MDK_APP_SHARED_MODULES` in `@tetherto/mdk-ui-foundation` — the CLI does not
 * depend on the UI packages; a test fails if the two drift.
 */
export const APP_UI_SHARED_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-router',
  '@tanstack/react-query',
  '@tetherto/mdk-ui-foundation',
  '@tetherto/mdk-react-adapter',
  '@tetherto/mdk-react-devkit',
] as const;

const SHARED = new Set<string>(APP_UI_SHARED_MODULES);

export interface AppUiCheck {
  errors: string[];
  warnings: string[];
}

// Static `import … from '…'`, `import '…'` and `export … from '…'`, at the
// start of a statement, and dynamic `import('…')`. Built ES modules (what
// `ui/` holds) write them this plainly; syntax is checked by Node separately.
const STATIC_IMPORT = /(?:^|[;\n}])\s*(import|export)\s*(?:([\w$\s{},*]*?)\s*from\s*)?(['"])([^'"\n]+)\3/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g;

// React 19 keeps its internals under this key in every build of `react` and
// `react-dom`: finding it in ui/ means a copy of React was bundled in.
const REACT_INTERNALS = '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE';

// Edits within this window of the build are taken as part of it: a fresh clone
// or copy writes ui/ and ui-src/ moments apart, in any order.
const STALE_TOLERANCE_MS = 2_000;

// How long the contract check may run the app's top-level code before giving up.
const CONTRACT_TIMEOUT_MS = 15_000;

const isBare = (specifier: string): boolean =>
  !specifier.startsWith('.') && !specifier.startsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(specifier);

/** The names a statement's clause imports: `{ a, b as c }` → a, b; `x` → default. */
function importedNames(kind: string, clause: string | undefined): string[] {
  if (!clause) return [];
  const names: string[] = [];
  const braces = clause.match(/\{([^}]*)\}/);
  if (braces) {
    for (const part of braces[1]!.split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]!.trim();
      if (name) names.push(name);
    }
  }
  // `import x from`, `import x, { … } from` — a default import; `* as ns` is not.
  const head = clause.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim();
  if (kind === 'import' && head && !head.startsWith('*')) names.push('default');
  return names;
}

/** Every bare import in `source`, with the names imported from each. */
export function scanImports(source: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const add = (specifier: string, names: string[]): void => {
    if (!isBare(specifier)) return;
    found.set(specifier, [...(found.get(specifier) ?? []), ...names]);
  };
  for (const m of source.matchAll(STATIC_IMPORT)) add(m[4]!, importedNames(m[1]!, m[2]));
  for (const m of source.matchAll(DYNAMIC_IMPORT)) add(m[2]!, []);
  return found;
}

/** Files under `dir`, skipping `node_modules`. */
function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return entry.isFile() ? [full] : [];
  });
}

/** Node's own parser, without running the code: `node --check` on a `.mjs` copy. */
function syntaxError(file: string, label: string): string | undefined {
  const work = mkdtempSync(join(tmpdir(), 'mdk-ui-check-'));
  try {
    const copy = join(work, 'module.mjs');
    copyFileSync(file, copy);
    const res = spawnSync(process.execPath, ['--check', copy], { encoding: 'utf8' });
    if (res.status === 0) return undefined;
    const detail = (res.stderr || '').split('\n').find((line) => /Error/.test(line))?.trim();
    return `${label} is not a valid JavaScript module${detail ? `: ${detail}` : ''}`;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function runnerPath(): string {
  const js = join(__dirname, 'app-ui-runner.js');
  return existsSync(js) ? js : join(__dirname, 'app-ui-runner.ts');
}

/**
 * Checks an app's built UI (`<dir>/ui/`) the way the dashboard will use it:
 *
 * - every `.js` file parses as an ES module;
 * - it does not bundle its own React;
 * - its bare imports are only the modules the dashboard provides
 *   ({@link APP_UI_SHARED_MODULES}) — anything else fails to resolve in the
 *   browser, and a missing `react` import usually means React was bundled in;
 * - with `runContract`, `ui/index.js` is loaded in a child Node process with
 *   those imports stubbed, and its default export checked against the app UI
 *   contract (id matching `mdk-app.yaml`, displayName, routes, panels). This
 *   runs the app's top-level code, so it is for the author's own package
 *   (`mdk validate app`), not for installing someone else's;
 * - `ui-src/` edited after the last build is a warning.
 */
export function checkAppUi(dir: string, opts: { id?: string; runContract?: boolean } = {}): AppUiCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const uiDir = join(dir, 'ui');
  const entry = join(uiDir, 'index.js');
  if (!existsSync(entry)) return { errors: ['ui/index.js: not found'], warnings };

  const imports = new Map<string, string[]>();
  for (const file of listFiles(uiDir).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'))) {
    const label = relative(dir, file).split(sep).join('/');
    const bad = syntaxError(file, label);
    if (bad) {
      errors.push(bad);
      continue;
    }
    const source = readFileSync(file, 'utf8');
    if (source.includes(REACT_INTERNALS)) {
      errors.push(
        `${label} bundles its own copy of React — leave the shared modules external in the UI build ` +
          '(rollupOptions.external: MDK_APP_SHARED_MODULES), or hooks break inside the dashboard',
      );
    }
    for (const [specifier, names] of scanImports(source)) {
      if (!SHARED.has(specifier)) {
        errors.push(
          `${label} imports "${specifier}", which the dashboard does not provide — bundle it, ` +
            `or import only: ${APP_UI_SHARED_MODULES.join(', ')}`,
        );
      }
      imports.set(specifier, [...(imports.get(specifier) ?? []), ...names]);
    }
  }

  // A ui-src/ newer than the build means the published UI would be stale.
  const src = join(dir, 'ui-src');
  if (existsSync(src)) {
    const built = statSync(entry).mtimeMs;
    const newer = listFiles(src).find((file) => statSync(file).mtimeMs > built + STALE_TOLERANCE_MS);
    if (newer) {
      warnings.push(`${relative(dir, newer).split(sep).join('/')} changed after ui/ was built — run \`npm run build:ui\``);
    }
  }

  if (opts.runContract && opts.id && !errors.length) {
    const res = spawnSync(process.execPath, [runnerPath()], {
      encoding: 'utf8',
      timeout: CONTRACT_TIMEOUT_MS,
      env: {
        ...process.env,
        MDK_UI_ENTRY: entry,
        MDK_UI_ID: opts.id,
        MDK_UI_IMPORTS: JSON.stringify(Object.fromEntries(imports)),
      },
    });
    const line = (res.stdout || '').trim().split('\n').at(-1);
    try {
      const result = JSON.parse(line ?? '') as AppUiCheck;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    } catch {
      const reason = res.error?.message ?? ((res.stderr || '').trim().split('\n')[0] || `exit code ${res.status}`);
      warnings.push(`could not check the UI contract (${reason}); the dashboard checks it when it loads the app`);
    }
  }

  return { errors, warnings };
}
