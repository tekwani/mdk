import type { LoadedAppUi, MdkAppRoute } from '@tetherto/mdk-react-adapter'
import type { SidebarMenuItem } from '@tetherto/mdk-react-devkit'
import type { ReactNode } from 'react'

/**
 * Where the shell mounts installed apps' pages: `/app/<name>/…`.
 *
 * Not to be confused with `MDK_APP_UI_BASE` (`/app-ui/<name>/`), where the
 * dashboard serves an app's built files. And not `/apps/<name>/…`, which is the
 * Gateway's: it forwards those paths to the app's own routes, and a shell served
 * by the Gateway must not route its own pages onto API paths (a reload would
 * land on JSON).
 */
export const APP_PAGES_BASE = '/app'

/** Router pattern every installed app's pages render under. */
export const APP_PAGES_ROUTE = 'app/:appName/*'

const isIndex = (path: string): boolean => path === '' || path === '/'

/** The shell path of one app page: `buildAppPagePath('sentinel', 'drift')` → `/app/sentinel/drift`. */
export const buildAppPagePath = (name: string, path = ''): string =>
  isIndex(path)
    ? `${APP_PAGES_BASE}/${name}`
    : `${APP_PAGES_BASE}/${name}/${path.replace(/^\//, '')}`

/** An app route as react-router takes it, relative to the app's mount. */
export const toRouterPath = (path: string): { index: true } | { path: string } =>
  isIndex(path) ? { index: true } : { path: path.replace(/^\//, '') }

// Deep links (`:param`, `*`) need a value only another page can give them.
const isNavigable = (route: MdkAppRoute): boolean => !route.hidden && !/[:*]/.test(route.path)

/**
 * Sidebar entries for the installed apps: one entry for an app with one page,
 * a group named after the app for one with several.
 */
export const appPageSidebarItems = (apps: LoadedAppUi[], icon: (path: string) => ReactNode): SidebarMenuItem[] =>
  apps.flatMap(({ app, ui }) => {
    const pages = ui.routes.filter(isNavigable).map((route) => {
      const id = buildAppPagePath(app.name, route.path)
      return { id, label: route.label ?? (isIndex(route.path) ? app.displayName : route.path), icon: icon(id) }
    })

    const [first] = pages
    if (!first) return []
    if (pages.length === 1) return [{ ...first, label: ui.routes.find(isNavigable)?.label ?? app.displayName }]
    return [{ id: first.id, label: app.displayName, icon: first.icon, items: pages }]
  })
