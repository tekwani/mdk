import type { InstalledApp } from '@tetherto/mdk-ui-foundation'
import { createContext, type FC, type ReactNode, useContext, useMemo } from 'react'

import { useMdkContext } from '../provider/mdk-provider'

/**
 * What an app's own components know about the app they belong to.
 *
 * @category apps
 */
export type MdkAppContextValue = {
  /** Installed name — the operator's handle, not fixed by the app. */
  name: string
  /** The app's reverse-DNS id. */
  id: string
  version: string
  displayName: string
  /** Prefix of the app's own API routes, e.g. `/apps/sentinel`. */
  apiBase: string
  /**
   * Absolute URL of one of the app's own routes: `apiUrl('/status')` →
   * `<gateway>/apps/sentinel/status`. Use it instead of hardcoding the mount —
   * the installed name is the operator's choice.
   */
  apiUrl: (path: string) => string
}

const MdkAppContext = createContext<MdkAppContextValue | null>(null)

export type MdkAppProviderProps = {
  app: InstalledApp
  children: ReactNode
}

/**
 * Scopes a subtree to one installed app. The shell wraps every page and panel
 * an app contributes in one, so the app can find its own API with
 * {@link useMdkApp}.
 *
 * @category apps
 */
export const MdkAppProvider: FC<MdkAppProviderProps> = ({ app, children }) => {
  const { apiBaseUrl } = useMdkContext()

  const value = useMemo<MdkAppContextValue>(
    () => ({
      name: app.name,
      id: app.id,
      version: app.version,
      displayName: app.displayName,
      apiBase: app.apiBase,
      apiUrl: (path) =>
        `${apiBaseUrl.replace(/\/$/, '')}${app.apiBase}${path.startsWith('/') ? path : `/${path}`}`,
    }),
    [app, apiBaseUrl],
  )

  return <MdkAppContext.Provider value={value}>{children}</MdkAppContext.Provider>
}

/**
 * The app the calling component belongs to. For code inside an app's UI; throws
 * anywhere else, since there is no app to answer for.
 *
 * @example
 * ```tsx
 * const { apiUrl } = useMdkApp()
 * const status = useQuery({ queryKey: ['sentinel', 'status'], queryFn: () => mdkFetch(apiUrl('/status')) })
 * ```
 * @category apps
 */
export const useMdkApp = (): MdkAppContextValue => {
  const value = useContext(MdkAppContext)
  if (!value) throw new Error('useMdkApp must be used inside an app page or panel (MdkAppProvider)')
  return value
}
