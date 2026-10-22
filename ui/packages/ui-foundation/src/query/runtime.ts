/**
 * What a `QueryClient` built by `createMdkQueryClient` carries: where the
 * Gateway lives (`baseUrl`) and the auth-aware transport for it (`fetcher`).
 * Both ride on the client's `meta`, so a plain function with the client in hand
 * (a query function, the auth provider's refresh) can reach them without React
 * context.
 *
 * @category query
 */

import type { QueryClient } from '@tanstack/query-core'

/** Fallback API base URL when neither an override nor an env var is set. */
export const DEFAULT_API_BASE_URL = 'http://localhost:3000'

/**
 * Transport contract: take a URL, return parsed JSON. The client's fetcher adds
 * the session's bearer token and turns a non-2xx response into an error.
 */
export type Fetcher = <T>(url: string, init?: RequestInit) => Promise<T>

/** What `createMdkQueryClient` stashes on the client. */
export type MdkRuntime = {
  /** Resolved API base URL. `''` means "use relative URLs" (reverse proxy). */
  baseUrl: string
  /** Auth-aware transport. Absent only on a client MDK did not build. */
  fetcher?: Fetcher
}

/* Trim trailing slashes without a regex: an unanchored `/\/+$/` backtracks
 * polynomially (ReDoS) on long slash-heavy input; this linear scan does not. */
const trimTrailingSlashes = (value: string): string => {
  let end = value.length
  while (end > 0 && value.charAt(end - 1) === '/') end -= 1
  return value.slice(0, end)
}

/**
 * Join a base URL and a path, tolerating a trailing slash on the base and a
 * missing leading slash on the path.
 */
export const buildUrl = (base: string, path: string): string => {
  const trimmedBase = trimTrailingSlashes(base)
  const trimmedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimmedBase}${trimmedPath}`
}

/** Read the runtime stashed on a client by `createMdkQueryClient`. */
const readRuntime = (client: QueryClient): Partial<MdkRuntime> => {
  const meta = client.getDefaultOptions().queries?.meta as
    | { apiBaseUrl?: string, fetcher?: Fetcher }
    | undefined
  return { baseUrl: meta?.apiBaseUrl, fetcher: meta?.fetcher }
}

/**
 * Read the configured base URL back from a `QueryClient`. Falls back to the
 * default when the client was not produced by `createMdkQueryClient`.
 *
 * @category query
 */
export const getApiBaseUrl = (client: QueryClient): string =>
  readRuntime(client).baseUrl ?? DEFAULT_API_BASE_URL

/**
 * Read the client's auth-aware fetcher, or `undefined` for a client MDK did
 * not build. Use it to call your Gateway routes with the session's token.
 *
 * @category query
 */
export const getFetcher = (client: QueryClient): Fetcher | undefined =>
  readRuntime(client).fetcher

/**
 * Read the whole runtime at once. `baseUrl` is always resolved.
 *
 * @category query
 */
export const getMdkRuntime = (client: QueryClient): MdkRuntime => ({
  baseUrl: getApiBaseUrl(client),
  fetcher: getFetcher(client),
})
