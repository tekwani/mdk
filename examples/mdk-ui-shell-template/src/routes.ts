import type { ComponentType } from 'react'

/**
 * Single source of truth for sidebar pages. Managed by `mdk-ui add page` and
 * `mdk-ui remove page`. The SignIn / Home / NotFound routes are hardcoded in
 * `src/router.tsx` and not present here.
 *
 * A fresh shell ships with a single `System Info` example page (a minimal,
 * working API-backed page you can delete once your own pages exist). Add more
 * pages with `mdk-ui add page <Name>` (e.g. `mdk-ui add page Dashboard`), which
 * appends a one-line entry below and wires the sidebar nav icon.
 *
 * Keep entries on a single line — the CLI's add/remove tooling matches whole
 * lines. Do not remove the `mdk:routes-end` marker.
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
  { path: '/system-info', label: 'System Info', page: () => import('./pages/SystemInfo') },
  // mdk:routes-end
]
