import { siteQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthToken } from './use-auth-token'

export type UseSiteOptions = {
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UseSiteResult = {
  /** Configured site label (e.g. `Site A`), or `undefined` while loading. */
  site: string | undefined
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches the configured site label from `GET /auth/site`. Static
 * deployment config — fetched once per session, no polling.
 *
 * @remarks
 * The `/auth/site` endpoint is illustrative. MDK does not ship built-in
 * endpoints — create your own via a
 * [Gateway plugin](https://docs.tether.io/mdk/guides/gateway/plugins) matching
 * your Worker/business logic. See the
 * [full-site example](https://github.com/tetherto/mdk/tree/main/examples/full-site/plugins/site)
 * for a working reference.
 *
 * @category op-centre
 */
export const useSite = (options: UseSiteOptions = {}): UseSiteResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...siteQuery(queryClient),
    enabled: options.enabled ?? !!token,
    staleTime: Number.POSITIVE_INFINITY,
  })

  return {
    site: result.data?.site,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
