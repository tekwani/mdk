/**
 * @tetherto/mdk-ui-foundation — framework-agnostic headless core for the MDK Devkit.
 *
 * Exposes:
 *   - Zustand vanilla stores: auth / devices / timezone / notifications
 *   - TanStack `QueryClient` factory (`createMdkQueryClient`) with environment-aware
 *     base URL resolution
 *   - The client's base URL and auth-aware fetcher (`getApiBaseUrl`, `getFetcher`)
 *   - Auth providers (`noAuth`, `bearerTokenAuth`, `gatewayRedirectAuth`) and
 *     device type / tag helpers
 *   - Shared API types and pool/settings/chart type contracts
 */

export * from './apps'
export * from './auth'
export * from './constants'
export * from './query'
export * from './store'
export * from './types'

export * from './utils'

export const VERSION = '0.0.1'
