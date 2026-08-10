import { userInfoQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthToken } from './use-auth-token'

/**
 * Fetches `/auth/userinfo` and returns the current user's email.
 * Used by `useLiveActions` to partition actions into "mine vs others".
 *
 * @remarks
 * **Prerequisite:** `/auth/userinfo` has no default Gateway provider; the
 * bundled `@tetherto/mdk-plugin-auth` ships unwired. Without a
 * [Gateway plugin](https://docs.tether.io/mdk/guides/gateway/plugins) serving
 * that route, this hook resolves to `undefined`. See the
 * [full-site example](https://github.com/tetherto/mdk/tree/main/examples/full-site/plugins/site)
 * for a working reference.
 *
 * @category auth
 */
export const useCurrentUserEmail = (): string | undefined => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const factory = userInfoQuery(queryClient)

  const result = useQuery({
    ...factory,
    enabled: !!token,
    staleTime: 5 * 60 * 1_000,
  })

  const data = result.data
  if (!data) return undefined

  // metadata.email takes precedence over top-level email
  const metaEmail =
    data.metadata && typeof data.metadata.email === 'string' ? data.metadata.email : undefined
  const topEmail = typeof data.email === 'string' ? data.email : undefined

  return metaEmail || topEmail
}
