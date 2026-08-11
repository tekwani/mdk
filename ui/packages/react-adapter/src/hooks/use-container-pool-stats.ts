import { type ContainerPoolStat, containerPoolStatsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UseContainerPoolStatsOptions = {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UseContainerPoolStatsResult = {
  /** Per-container override-count rows. */
  data: ContainerPoolStat[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches per-container pool override counts from
 * `GET /auth/pools/stats/containers`. Feeds the Sites Overview cards.
 *
 * @remarks
 * The `/auth/pools/*` endpoint is illustrative. MDK does not ship built-in
 * endpoints — create your own via a
 * [Gateway plugin](https://docs.tether.io/mdk/guides/gateway/plugins) matching
 * your Worker/business logic. See the
 * [full-site example](https://github.com/tetherto/mdk/tree/main/examples/full-site/plugins/site)
 * for a working reference.
 *
 * @category dashboard
 */
export const useContainerPoolStats = (
  options: UseContainerPoolStatsOptions = {},
): UseContainerPoolStatsResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const factory = containerPoolStatsQuery(queryClient)

  const result = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: options.enabled ?? !!token,
  })

  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
