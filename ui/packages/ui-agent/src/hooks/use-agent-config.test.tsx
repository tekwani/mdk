import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMdkQueryClient } from '@tetherto/mdk-ui-foundation'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAgentConfig } from './use-agent-config'

const wrapWith = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

describe('useAgentConfig', () => {
  it('inherits the base URL the app already configured', () => {
    // Otherwise the same origin has to be configured twice — once for MDK and again
    // for the panel — with nothing to catch the two drifting apart.
    const { result } = renderHook(() => useAgentConfig(), {
      wrapper: wrapWith(createMdkQueryClient({ apiBaseUrl: 'https://fleet.example' })),
    })

    expect(result.current.baseUrl).toBe('https://fleet.example')
  })

  it('keeps the empty base URL the generated shell sets on purpose', () => {
    // '' is not "unset" here: it means relative URLs, which is how the shell reaches a
    // gateway through the dev proxy. Treating it as absent would break every request.
    const { result } = renderHook(() => useAgentConfig(), {
      wrapper: wrapWith(createMdkQueryClient({ apiBaseUrl: '' })),
    })

    expect(result.current.baseUrl).toBe('')
  })

  it('does not inherit the default from a client MDK did not build', () => {
    // getApiBaseUrl answers http://localhost:3000 for a bare client. Inheriting that
    // would silently point the panel at an origin nobody chose — and one the gateway
    // sends no CORS headers for.
    const { result } = renderHook(() => useAgentConfig(), {
      wrapper: wrapWith(new QueryClient()),
    })

    expect(result.current.baseUrl).toBe('')
  })

  it('works with no provider above it at all', () => {
    const { result } = renderHook(() => useAgentConfig())

    expect(result.current.baseUrl).toBe('')
  })

  it('lets an explicit prop win over the configured one', () => {
    const { result } = renderHook(() => useAgentConfig({ apiBaseUrl: 'https://other.example' }), {
      wrapper: wrapWith(createMdkQueryClient({ apiBaseUrl: 'https://fleet.example' })),
    })

    expect(result.current.baseUrl).toBe('https://other.example')
  })
})
