export const ROUTE_PATHS = {
  ROOT: '/',
  SIGN_IN: '/signin',
  HOME: '/home',
  // The paths below are anchors for the `_managed` demo pages. They are not
  // routed in a bare shell, but `mdk-ui add page <Name>` re-inserts the matching
  // `NAV_ICONS` entry keyed off these constants, so keep them in sync with
  // `MANAGED_PAGES` in the CLI even though nothing references them until a page
  // is added.
  DASHBOARD: '/dashboard',
  ALERTS: '/alerts',
  POOL_MANAGER: '/pool-manager',
  SITE_OVERVIEW: '/site-overview',
  EXPLORER: '/explorer',
  NOT_FOUND: '*',
} as const

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS]

/**
 * Router pattern for the Explorer container detail page. Registered directly in
 * `router.tsx` (not in `routes.ts`), so it never appears in the sidebar. The
 * `:tab?` segment is optional — a bare `/explorer/containers/:id` redirects to
 * the first supported tab.
 */
export const EXPLORER_CONTAINER_DETAIL_ROUTE = 'explorer/containers/:id/:tab?'

/** Default tab a container detail deep-link lands on. */
export const CONTAINER_DETAIL_DEFAULT_TAB = 'home'

/**
 * Builds an Explorer container detail path, e.g.
 * `/explorer/containers/container-2a/home?backUrl=/explorer`. `backUrl` lets the
 * detail page's Back link return to wherever the operator came from (the
 * Explorer list or a Site Overview card).
 */
export const buildContainerDetailPath = (
  id: string,
  tab: string = CONTAINER_DETAIL_DEFAULT_TAB,
  backUrl?: string,
): string => {
  const base = `${ROUTE_PATHS.EXPLORER}/containers/${encodeURIComponent(id)}/${tab}`
  return backUrl != null && backUrl.length > 0
    ? `${base}?backUrl=${encodeURIComponent(backUrl)}`
    : base
}
