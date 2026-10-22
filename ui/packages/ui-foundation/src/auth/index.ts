/**
 * Authentication for the MDK Gateway. `gatewayRedirectAuth` signs in through
 * the Gateway's OAuth redirect and refreshes `/auth/token`; `bearerTokenAuth`
 * sends a Gateway-issued token you already hold; `noAuth` is for a Gateway
 * running without an auth plugin (local dev). React bindings live in
 * `@tetherto/mdk-react-adapter`.
 */

export {
  authTokenMutation,
  GATEWAY_REFRESH_INTERVAL_MS,
  gatewayRedirectAuth,
  type GatewayRedirectAuthOptions,
} from './gateway-redirect-auth'
export {
  type AuthProvider,
  type AuthTokenStore,
  bearerTokenAuth,
  type BearerTokenAuthOptions,
  isSessionExpiredError,
  noAuth,
  SESSION_EXPIRED_STATUS,
} from './provider'
