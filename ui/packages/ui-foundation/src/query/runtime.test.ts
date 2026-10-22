import { QueryClient } from '@tanstack/query-core'
import { describe, expect, it } from 'vitest'

import { createMdkQueryClient } from './client'
import { buildUrl, getFetcher, getMdkRuntime } from './runtime'

describe('buildUrl', () => {
  it('joins a base and a path', () => {
    expect(buildUrl('http://api.test', '/auth/site')).toBe('http://api.test/auth/site')
  })

  it('strips trailing slashes from the base', () => {
    expect(buildUrl('http://api.test///', '/auth/site')).toBe('http://api.test/auth/site')
  })

  it('adds a missing leading slash to the path', () => {
    expect(buildUrl('http://api.test', 'auth/site')).toBe('http://api.test/auth/site')
  })

  it('supports a relative base (reverse-proxy mode)', () => {
    expect(buildUrl('', '/auth/site')).toBe('/auth/site')
  })

  /* Trailing-slash trimming is a linear scan rather than `/\/+$/` — that regex
   * backtracks polynomially on slash-heavy input (ReDoS). This asserts the
   * result stays correct for a pathological base and returns promptly. */
  it('trims a pathological run of trailing slashes', () => {
    const base = `http://api.test${'/'.repeat(50_000)}`
    expect(buildUrl(base, '/auth/site')).toBe('http://api.test/auth/site')
  })

  it('leaves a base that is only slashes empty', () => {
    expect(buildUrl('///', '/auth/site')).toBe('/auth/site')
  })
})

describe('runtime readers', () => {
  it('reports no fetcher for a hand-built client', () => {
    expect(getFetcher(new QueryClient())).toBeUndefined()
  })

  it('falls back to the default base URL for a hand-built client', () => {
    expect(getMdkRuntime(new QueryClient()).baseUrl).toBe('http://localhost:3000')
  })

  it('exposes the base URL and an auth-aware fetcher on a client MDK built', () => {
    const client = createMdkQueryClient({ apiBaseUrl: 'https://gateway.test' })
    const runtime = getMdkRuntime(client)

    expect(runtime.baseUrl).toBe('https://gateway.test')
    expect(typeof runtime.fetcher).toBe('function')
  })

  it('carries the same fetcher on mutations as on queries', () => {
    const client = createMdkQueryClient()
    const meta = client.getDefaultOptions().mutations?.meta as { fetcher?: unknown }
    expect(meta.fetcher).toBe(getFetcher(client))
  })
})
