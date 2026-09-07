import type { AgentTransportOptions, TokenSource } from '../core/transport'
import { useMdkAuth, useQueryClient } from '@tetherto/mdk-react-adapter'
import { getFetcher, getMdkRuntime } from '@tetherto/mdk-ui-foundation'
import { useMemo } from 'react'

export type AgentConfigOptions = {
  /**
   * Gateway origin. Defaults to whatever the app already configured on
   * `MdkProvider`, so a host that set its API base once does not set it again
   * here — and to `''` outside one, meaning relative URLs, which is what the
   * generated shell wants: it proxies `/agent` in dev and is served same-origin
   * in production. Set it only to override that, and remember the gateway sends
   * no CORS headers if you point it at another origin.
   */
  apiBaseUrl?: string
  /**
   * Bearer token source. Defaults to the `MdkProvider`'s auth provider, and to
   * no token at all outside one — which is correct for a gateway running without
   * an auth plugin, where every caller is the single local operator.
   */
  getToken?: TokenSource
  /** Injected in tests and by the catalog demo. */
  fetchImpl?: typeof fetch
}

/**
 * The base URL the app already configured on `MdkProvider`, or undefined.
 *
 * Two things make this narrower than a plain `getApiBaseUrl`. It has to survive
 * having no provider at all, since the panel is meant to drop into a non-MDK
 * app — `useQueryClient` throws there, and the context read happens before the
 * throw, so guarding it leaves hook order intact. And `getApiBaseUrl` answers
 * `http://localhost:3000` for a client MDK did not build, which would quietly
 * point the panel at an origin nobody chose. A fetcher in the meta is what says
 * the client came from `createMdkQueryClient`, so its base URL — including the
 * empty string the shell sets deliberately — is meant rather than defaulted.
 */
function useConfiguredBaseUrl(): string | undefined {
  // Neither MDK package re-exports the QueryClient type, and @tanstack/react-query is not a
  // dependency here — so the type comes from the hook that returns it.
  let client: ReturnType<typeof useQueryClient>
  try {
    client = useQueryClient()
  } catch {
    return undefined
  }
  return getFetcher(client) ? getMdkRuntime(client).baseUrl : undefined
}

/**
 * Resolves transport options from explicit props, falling back to the MDK
 * provider.
 *
 * `useMdkAuth` deliberately does not throw outside an `MdkProvider`, which is
 * what lets the panel be dropped into a non-MDK app with just an `apiBaseUrl`.
 */
export function useAgentConfig(options: AgentConfigOptions = {}): AgentTransportOptions {
  const auth = useMdkAuth()
  const configuredBaseUrl = useConfiguredBaseUrl()
  const { apiBaseUrl, getToken, fetchImpl } = options

  return useMemo<AgentTransportOptions>(
    () => ({
      baseUrl: apiBaseUrl ?? configuredBaseUrl ?? '',
      getToken: getToken ?? (() => auth.getToken()),
      ...(fetchImpl ? { fetchImpl } : {}),
    }),
    [apiBaseUrl, configuredBaseUrl, getToken, fetchImpl, auth],
  )
}
