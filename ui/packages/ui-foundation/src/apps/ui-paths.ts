/*
 * Kept free of imports, and published on its own subpath
 * (`@tetherto/mdk-ui-foundation/app-ui-paths`), so a dashboard's build config
 * running in plain Node can read the paths without loading the rest of the
 * package.
 */

/**
 * Where a dashboard serves the installed apps' built UIs, from its own origin:
 * an app's `ui/` directory is served at `<base>/<name>/`, so its entry is
 * `/app-ui/<name>/index.js`.
 *
 * Not `/apps/…`: that prefix is the Gateway's, which forwards it to each app's
 * own routes.
 *
 * @category apps
 */
export const MDK_APP_UI_BASE = '/app-ui'

/**
 * Where a dashboard lists the installed apps, from its own origin: an
 * {@link InstalledAppsResponse}. The dashboard writes it from the stack's
 * `mdk.yaml` (`mdk run dashboard`), so finding the apps needs no Gateway.
 *
 * @category apps
 */
export const MDK_APP_UI_MANIFEST = '/app-ui.json'
