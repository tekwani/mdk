import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { APP_MANIFEST } from './app-package.js';
import { resolvePackageDir } from './runtime.js';
import type { StackSpec } from './spec.js';

/**
 * Environment variable `mdk run dashboard` hands the installed apps to the
 * dashboard's dev server in: a JSON array of {@link DashboardApp}. The
 * dashboard serves each app's built `ui/` and lists the apps to the browser
 * itself, so finding them needs no Gateway.
 */
export const DASHBOARD_APPS_ENV = 'MDK_DASHBOARD_APPS';

/** One installed app, as the dashboard needs it to load the app's UI. */
export interface DashboardApp {
  /** Installed name (`spec.apps[].name`). */
  name: string;
  /** Reverse-DNS id from the app's `mdk-app.yaml`. */
  id: string;
  version: string;
  displayName: string;
  /** Where the app's own routes are reached through the Gateway: its `mount`, default `/apps/<name>`. */
  apiBase: string;
  /** The app package's directory; its built UI is `<dir>/ui/`. */
  dir: string;
}

type AppEntry = NonNullable<StackSpec['spec']['apps']>[number];

/**
 * Where the Gateway serves an app's own routes: its `mount`, or `/apps/<name>`
 * (startGateway's default). `mount: /` puts them at the root, so the prefix is
 * empty.
 */
export function appApiBase(app: Pick<AppEntry, 'name' | 'mount'>): string {
  const mount = app.mount ?? `/apps/${app.name}`;
  return mount === '/' ? '' : mount.replace(/\/+$/, '');
}

/**
 * Resolves each `spec.apps[]` package to its directory, as `mdk run` does
 * (`resolvePackageDir`); it must hold an `mdk-app.yaml`, or it is not an app.
 */
export function resolveAppDirs(projectDir: string, apps: AppEntry[]): Array<{ name: string; dir: string }> {
  return apps.map((app) => {
    let dir: string;
    try {
      dir = resolvePackageDir(projectDir, app.package);
    } catch (error) {
      throw new Error(`App "${app.name}": ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!existsSync(join(dir, APP_MANIFEST))) {
      throw new Error(`App "${app.name}": ${dir} has no ${APP_MANIFEST} — "${app.package}" is not an MDK app package.`);
    }
    return { name: app.name, dir };
  });
}

/**
 * The installed apps of a stack, read from `mdk.yaml` and each app's
 * `mdk-app.yaml`, for the dashboard to load. Throws naming the app when a
 * package is missing or its manifest lacks what the dashboard shows.
 */
export function describeDashboardApps(projectDir: string, apps: AppEntry[]): DashboardApp[] {
  return resolveAppDirs(projectDir, apps).map(({ name, dir }, i) => {
    let manifest: unknown;
    try {
      manifest = parseYaml(readFileSync(join(dir, APP_MANIFEST), 'utf8'));
    } catch (error) {
      throw new Error(`App "${name}": ${APP_MANIFEST}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const fields = (manifest ?? {}) as Record<string, unknown>;
    for (const field of ['id', 'version', 'displayName']) {
      if (typeof fields[field] !== 'string' || !fields[field]) {
        throw new Error(`App "${name}": ${APP_MANIFEST} is missing "${field}" — check it with \`mdk validate app ${name}\`.`);
      }
    }
    return {
      name,
      id: fields.id as string,
      version: fields.version as string,
      displayName: fields.displayName as string,
      apiBase: appApiBase(apps[i]!),
      dir,
    };
  });
}
