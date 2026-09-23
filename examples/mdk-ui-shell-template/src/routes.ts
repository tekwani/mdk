import type { ComponentType } from 'react'

/**
 * Single source of truth for sidebar pages. The SignIn / Home / NotFound routes
 * are hardcoded in `src/router.tsx` and not present here.
 *
 * A fresh shell ships with no example pages. To add a page: put the component
 * under `src/pages/`, append a one-line entry below, and add its nav icon in
 * `src/constants/navigation.tsx`. The canonical reference pages live under
 * `_managed/pages/` — copy one into `src/pages/` to use it.
 *
 * Keep entries on a single line — tooling matches whole lines. Do not remove
 * the `mdk:routes-end` marker.
 */

export interface AppRoute {
  /** Sidebar/nav path (without the leading `/` is fine — the router normalises it). */
  path: string
  /**
   * Router path when it differs from the nav path — e.g. a deep-link segment
   * like `/alerts/:uuid?`. The sidebar still keys off `path`. Defaults to `path`.
   */
  routePath?: string
  /** Sidebar label. */
  label: string
  /**
   * When true the route is registered with the router but hidden from the
   * sidebar — for deep-link-only pages reached from another page (e.g. the
   * Explorer container detail, opened from a row/card, not a nav item).
   */
  hidden?: boolean
  /** Dynamic import for the page component. */
  page: () => Promise<{ default: ComponentType }>
}

export const ROUTES: AppRoute[] = [
  // mdk:routes-end
]
