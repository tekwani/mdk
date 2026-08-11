import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSystemInfo } from '../use-system-info'

const wrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return Wrapper
}

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { meta: { apiBaseUrl: 'http://api' }, retry: false } },
  })

/** Route each request to a canned body by matching a path fragment in the URL. */
const routeFetch = (byPath: Record<string, unknown>) =>
  vi.fn(async (input: string | URL) => {
    const url = String(input)
    const match = Object.keys(byPath).find((path) => url.includes(path))
    return new Response(JSON.stringify(match ? byPath[match] : {}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })

describe('useSystemInfo', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('composes site, userinfo and featureConfig into a shaped payload', async () => {
    const fetchSpy = routeFetch({
      '/auth/site': { site: 'Site A' },
      '/auth/userinfo': { email: 'top@x.com', metadata: { email: 'meta@x.com', roles: 'admin' } },
      '/auth/featureConfig': { flagA: true, flagB: false, flagC: true },
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useSystemInfo(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.info.site).toBe('Site A'))
    await waitFor(() => expect(result.current.info.email).toBe('meta@x.com'))
    expect(result.current.info.roles).toBe('admin')
    expect(result.current.info.featureCount).toBe(3)
    expect(result.current.isLoading).toBe(false)

    const urls = fetchSpy.mock.calls.map((call) => String(call[0]))
    expect(urls).toContain('http://api/auth/site')
    expect(urls).toContain('http://api/auth/userinfo')
    expect(urls).toContain('http://api/auth/featureConfig')
  })

  it('falls back to top-level email and leaves roles undefined when metadata is absent', async () => {
    vi.stubGlobal(
      'fetch',
      routeFetch({
        '/auth/site': { site: 'S' },
        '/auth/userinfo': { email: 'fallback@x.com' },
        '/auth/featureConfig': {},
      }),
    )

    const { result } = renderHook(() => useSystemInfo(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.info.email).toBe('fallback@x.com'))
    expect(result.current.info.roles).toBeUndefined()
    expect(result.current.info.featureCount).toBe(0)
  })

  it('does not fetch without an auth token', () => {
    authStore.getState().reset()
    const fetchSpy = routeFetch({ '/auth/site': { site: 'x' } })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useSystemInfo(), { wrapper: wrapper(makeClient()) })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.info.site).toBeUndefined()
  })

  it('surfaces an error when a read fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    )

    const { result } = renderHook(() => useSystemInfo(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.error).toBeTruthy())
  })

  it('refetch re-runs all three reads', async () => {
    const fetchSpy = routeFetch({
      '/auth/site': { site: 'Site A' },
      '/auth/userinfo': { metadata: { email: 'e@x.com' } },
      '/auth/featureConfig': { flagA: true },
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useSystemInfo(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.info.site).toBe('Site A'))
    const callsBefore = fetchSpy.mock.calls.length

    act(() => result.current.refetch())

    await waitFor(() => expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore))
  })
})
