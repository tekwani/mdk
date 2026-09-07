import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Package root of the CLI itself — the anchor for finding the MDK checkout. */
const CLI_ROOT = resolve(__dirname, '..', '..');

export interface CatalogPlugin {
  /** npm package name — what `mdk.yaml` references when it resolves from the registry. */
  value: string;
  label: string;
  hint: string;
  /**
   * Location inside the MDK checkout, for a package that ships with MDK but is
   * not on npm yet. When the CLI runs from the checkout, the project depends on
   * it via `addPathBackedDependency`: a relative `file:` link to the checkout
   * path (whether that path sits inside the project folder or elsewhere in the
   * monorepo) — never by appending the path to `workspaces`, and never via bare
   * `*` (npm would treat that as a registry range outside a parent workspace).
   * `npm install` links it into `node_modules/<package>`, exactly as it would a
   * published package. No project folder is created for it: `workers/*` and
   * `plugins/*` are reserved for packages the user actually owns
   * (`mdk create ...`).
   *
   * Linking (rather than copying) also keeps in-checkout relative resolution
   * working: Node resolves a symlinked package from its real location, so a
   * device mock finds its shared framework and a gateway plugin finds the deps
   * in its own node_modules.
   */
  repoPath?: string;
}

export interface CatalogWorker extends CatalogPlugin {
  /** Worker-level config the plugin reads, beyond its device list. */
  config?: Record<string, unknown>;
  /**
   * Per-device opts beyond the `host`/`port`/`serial` every seed device gets.
   *
   * One object is handed to both the plugin's `connect()` and the device mock,
   * so it has to satisfy both at once.
   */
  deviceOpts?: Record<string, unknown>;
  /** Boot a device simulator from `<pkg>/mock/server.js`, so no hardware is needed. */
  mock?: boolean;
}

/**
 * Worker plugins offered by `mdk onboard`. Every entry today has a `repoPath`
 * and is real/runnable from the checkout — the field stays optional for a
 * future entry that isn't (selecting one without a `repoPath` would still
 * write a valid spec entry, but its install would 404 and its device config
 * would need to be filled in by hand).
 */
export const WORKER_CATALOG: CatalogWorker[] = [
  {
    value: '@tetherto/mdk-worker-demo',
    label: 'mdk-worker-demo',
    hint: 'plugin-authoring demo (hypothetical v3 firmware) — bundled, runs against a simulator',
    repoPath: join('backend', 'workers', 'samples', 'demo-worker'),
    mock: true,
  },
];

/**
 * Gateway plugins offered by `mdk onboard`. Every entry today has a `repoPath`
 * and is real/runnable from the MDK checkout — the field stays optional for a
 * future entry that isn't (selecting one without a `repoPath` would still
 * write a valid spec entry, but its install would 404).
 */
export const GATEWAY_CATALOG: CatalogPlugin[] = [
  {
    value: '@tetherto/mdk-plugin-agent',
    label: 'mdk-plugin-agent',
    hint: 'auth-gated operator agent chat (sessions, SSE, approvals) — bundled',
    repoPath: join('backend', 'plugins', 'agent'),
  },
  {
    value: '@tetherto/mdk-plugin-demo',
    label: 'mdk-plugin-demo',
    hint: 'demo-worker fleet summary + history aggregation — bundled',
    repoPath: join('backend', 'plugins', 'demo'),
  },
];

export function findCatalogWorker(pkg: string): CatalogWorker | undefined {
  return WORKER_CATALOG.find((entry) => entry.value === pkg);
}

export function findCatalogGatewayPlugin(pkg: string): CatalogPlugin | undefined {
  return GATEWAY_CATALOG.find((entry) => entry.value === pkg);
}

/**
 * Absolute path to `repoPath` in the MDK checkout, found by walking up from the
 * CLI's own location. Returns null when the CLI is installed standalone from
 * npm, where there is no checkout to point at.
 */
function findInCheckout(repoPath: string): string | null {
  let dir = CLI_ROOT;
  while (dir !== dirname(dir)) {
    const candidate = join(dir, repoPath);
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    dir = dirname(dir);
  }
  return null;
}

export interface ResolvedCatalogPackage {
  /** npm package name — what `mdk.yaml` references and what lands in node_modules. */
  packageName: string;
  /** True when the package is linked from the checkout rather than the registry. */
  bundled: boolean;
  /** Set when the entry wanted the checkout but the CLI is running standalone. */
  unavailable?: boolean;
  /** Absolute checkout path — present when bundled and resolvable. */
  checkoutDir?: string;
}

/**
 * Decides how a selected catalog entry (worker or gateway plugin) should be
 * installed. A bundled package is path-backed with a relative `file:` dep to
 * its checkout directory; everything else is installed from the registry.
 */
export function resolveCatalogPackage(entry: CatalogPlugin): ResolvedCatalogPackage {
  const packageName = entry.value;
  if (!entry.repoPath) return { packageName, bundled: false };

  const dir = findInCheckout(entry.repoPath);
  if (dir) return { packageName, bundled: true, checkoutDir: dir };
  return { packageName, bundled: false, unavailable: true };
}
