/**
 * Test harness for the adapter hooks: a real `MdkProvider` around a
 * `createMdkQueryClient` client, with `fetch` stubbed.
 *
 * ```tsx
 * const harness = createMdkHarness({ respond: { items: [{ name: 'a' }] } })
 * const { result } = renderHook(() => useSomething(), { wrapper: harness.Wrapper })
 * ```
 *
 * Without `respond`, any request fails with a message naming the URL, rather
 * than hanging until the test times out.
 */

import { authStore, createMdkQueryClient } from '@tetherto/mdk-ui-foundation'
import type { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { vi } from 'vitest'

import { MdkProvider } from '../provider/mdk-provider'

export type MdkHarnessOptions = {
  /**
   * Session token put into `authStore`. Pass `null` to assert the signed-out
   * path.
   */
  token?: string | null
  /** Base URL handed to the provider. Irrelevant to assertions; kept configurable. */
  apiBaseUrl?: string
  /**
   * Payload served for **any** request the hook makes. Pass a function to vary
   * the response per call (by call index or URL).
   */
  respond?: unknown | ((url: string, callIndex: number) => unknown)
}

export type MdkHarness = {
  queryClient: QueryClient
  Wrapper: (props: { children: ReactNode }) => ReactNode
  /**
   * Requests that reached the transport. With `respond` set this is every
   * request the hook made; without it, any request fails loudly.
   */
  requests: string[]
}

/**
 * Transport stub.
 *
 * Without `respond`, every request is rejected with the offending URL. With it,
 * the payload is served as a JSON `Response`, so the client's real fetcher
 * (status check, content-type sniff, JSON parse) is exercised.
 */
const createStubFetch = (
  seen: string[],
  respond: MdkHarnessOptions['respond'],
  hasRespond: boolean,
): typeof fetch =>
  ((input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    const callIndex = seen.length
    seen.push(url)

    if (!hasRespond) {
      return Promise.reject(
        new Error(
          `Unexpected network call in a test: ${url}\n`
          + 'Pass `respond` to createMdkHarness() to serve a payload.',
        ),
      )
    }

    const body = typeof respond === 'function'
      ? (respond as (url: string, callIndex: number) => unknown)(url, callIndex)
      : respond

    return Promise.resolve(
      new Response(JSON.stringify(body ?? null), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
  }) as typeof fetch

/**
 * Build a provider-backed harness for hook tests.
 *
 * `fetch` is stubbed via `vi.stubGlobal`, so a suite-level
 * `afterEach(() => { vi.unstubAllGlobals(); authStore.getState().reset() })`
 * restores global state — the same convention the existing specs use.
 */
export const createMdkHarness = (options: MdkHarnessOptions = {}): MdkHarness => {
  const { token = 'test-token', apiBaseUrl = '' } = options
  const hasRespond = 'respond' in options
  const requests: string[] = []

  const queryClient = createMdkQueryClient({
    apiBaseUrl,
    defaultOptions: {
      queries: {
        // Never stale, so TanStack schedules no background refetch mid-test.
        staleTime: Number.POSITIVE_INFINITY,
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false },
    },
  })

  vi.stubGlobal('fetch', createStubFetch(requests, options.respond, hasRespond))

  if (token !== null) authStore.getState().setToken(token)

  const Wrapper = ({ children }: { children: ReactNode }): ReactNode => (
    <MdkProvider apiBaseUrl={apiBaseUrl} queryClient={queryClient}>
      {children}
    </MdkProvider>
  )

  return { queryClient, Wrapper, requests }
}
