/**
 * "Managed pages" are the fully-wired demo pages the `mdk-ui-shell` template
 * bundles under `_managed/pages/` (Dashboard, Pool Manager, Alerts, …). They
 * are NOT scaffolded into a fresh app — `create` ships a bare backbone and
 * strips `_managed/` — so they exist only as canonical sources the CLI can add
 * on demand. Unlike a generic `add page <Component>` — which scaffolds a
 * placeholder/example from the registry — these resolve to a canonical,
 * hand-wired page file bundled with the CLI. `add page` copies that file
 * verbatim into `src/pages/` and registers both its route and its sidebar nav
 * icon; `remove page` deletes the file and unregisters both. The result is a
 * complete add/remove lifecycle (page + route + nav), per plan WS-G.
 */
export type ManagedPage = {
  /** PascalCase page identity (also the generated file name, sans `.tsx`). */
  name: string
  /** Template id that holds the canonical wired page. */
  templateId: string
  /** Path of the canonical page within the template dir. */
  templatePagePath: string
  /** Canonical single-line `ROUTES` entry (no indentation). */
  routeEntry: string
  /** Nav path used to detect an already-registered route. */
  routePath: string
  /**
   * Devkit nav-icon component imported in `navigation.tsx`. Omit for hidden,
   * deep-link-only pages that have no sidebar entry.
   */
  navIcon?: string
  /**
   * Canonical single-line `NAV_ICONS` entry (no indentation). Omit for hidden
   * pages — `add`/`remove page` then skip all nav patching for this page.
   */
  navEntry?: string
}

/**
 * The canonical, fully-wired demo pages the `mdk-ui-shell` template bundles and
 * that `add page` / `remove page` manage end-to-end (file + route + nav icon).
 */
export const MANAGED_PAGES: ManagedPage[] = [
  {
    // The reference operations dashboard (hashrate + consumption charts, active
    // incidents, mining pools). Was the template's default landing page before
    // the shell was slimmed to a bare backbone; `add page Dashboard` restores it.
    name: 'Dashboard',
    templateId: 'mdk-ui-shell',
    templatePagePath: '_managed/pages/Dashboard.tsx',
    routeEntry: "{ path: '/dashboard', label: 'Dashboard', page: () => import('./pages/Dashboard') },",
    routePath: '/dashboard',
    navIcon: 'DashboardNavIcon',
    navEntry: '[ROUTE_PATHS.DASHBOARD]: <DashboardNavIcon />,',
  },
  {
    name: 'PoolManager',
    templateId: 'mdk-ui-shell',
    templatePagePath: '_managed/pages/PoolManager.tsx',
    routeEntry:
      "{ path: '/pool-manager', label: 'Pool Manager', page: () => import('./pages/PoolManager') },",
    routePath: '/pool-manager',
    navIcon: 'PoolManagerNavIcon',
    // Use the ROUTE_PATHS constant (matching the template's seeded entry) so a
    // remove→add round-trip re-inserts an identical, non-drifting line.
    navEntry: '[ROUTE_PATHS.POOL_MANAGER]: <PoolManagerNavIcon />,',
  },
  {
    name: 'Alerts',
    templateId: 'mdk-ui-shell',
    templatePagePath: '_managed/pages/Alerts.tsx',
    routeEntry:
      "{ path: '/alerts', routePath: '/alerts/:uuid?', label: 'Alerts', page: () => import('./pages/Alerts') },",
    routePath: '/alerts',
    navIcon: 'AlertsNavIcon',
    navEntry: '[ROUTE_PATHS.ALERTS]: <AlertsNavIcon />,',
  },
  {
    name: 'SiteOverview',
    templateId: 'mdk-ui-shell',
    templatePagePath: '_managed/pages/SiteOverview.tsx',
    routeEntry:
      "{ path: '/site-overview', label: 'Site Overview', page: () => import('./pages/SiteOverview') },",
    routePath: '/site-overview',
    navIcon: 'ContainerWidgetsNavIcon',
    navEntry: '[ROUTE_PATHS.SITE_OVERVIEW]: <ContainerWidgetsNavIcon />,',
  },
  {
    name: 'Explorer',
    templateId: 'mdk-ui-shell',
    templatePagePath: '_managed/pages/Explorer.tsx',
    routeEntry:
      "{ path: '/explorer', label: 'Explorer', page: () => import('./pages/Explorer') },",
    routePath: '/explorer',
    navIcon: 'ExplorerNavIcon',
    navEntry: '[ROUTE_PATHS.EXPLORER]: <ExplorerNavIcon />,',
  },
  {
    // Deep-link container detail page — reached from an Explorer row or a Site
    // Overview card, never from the sidebar. Registered as a `hidden` route
    // (no nav icon / no NAV_ICONS entry), so add/remove skip all nav patching.
    name: 'ExplorerContainerDetail',
    templateId: 'mdk-ui-shell',
    templatePagePath: '_managed/pages/ExplorerContainerDetail.tsx',
    routeEntry:
      "{ path: '/explorer/containers', routePath: '/explorer/containers/:id/:tab?', label: 'Container Detail', hidden: true, page: () => import('./pages/ExplorerContainerDetail') },",
    routePath: '/explorer/containers',
  },
]

/** Normalise a free-form page name for matching (case/separator-insensitive). */
const normalise = (value: string): string => value.replace(/[^a-z0-9]/gi, '').toLowerCase()

/**
 * Resolve a managed page from a free-form name. Accepts any casing/separators
 * (`PoolManager`, `pool-manager`, `poolmanager` all match), so the canonical
 * artifacts are produced regardless of how the command was typed.
 */
export const findManagedPage = (pageName: string): ManagedPage | undefined => {
  const needle = normalise(pageName)
  return MANAGED_PAGES.find((p) => normalise(p.name) === needle)
}
