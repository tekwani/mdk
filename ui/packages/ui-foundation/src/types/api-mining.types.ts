/**
 * API contracts for the Gateway mining endpoints consumed by MDK UI Shell.
 *
 * All requests target the `/auth/...` namespace and require a
 * `Authorization: Bearer <token>` header. Responses are intentionally typed
 * loosely (`Record<string, unknown>` shapes, optional fields) because the
 * backend returns the union of aggregate fields requested in `aggrFields`
 * and the chart components consume them with `lodash.get` semantics.
 */

/**
 * A single time-bucketed entry from `GET /auth/tail-log`. Backend returns
 * `Array<Array<TailLogEntry>>` (outer wrapping is the per-worker grouping —
 * single-site dashboards take `_head(response)`).
 *
 * @category api
 */
export type TailLogEntry = {
  ts: number
  /** All other fields are dynamic aggregates requested via `aggrFields`. */
  [key: string]: unknown
}
/**
 * Power-mode timeline entry — carries grouped per-miner mode/status maps
 * keyed by miner id. Consumed by `PowerModeTimelineChart`.
 *
 * @category api
 */
export type PowerModeTimelineEntry = TailLogEntry & {
  power_mode_group_aggr?: Record<string, string>
  status_group_aggr?: Record<string, string>
}

/**
 * Severity literal expected by the `ActiveIncidentsCard` row component.
 *
 * @category api
 */
export type AlertSeverity = 'critical' | 'high' | 'medium'
/**
 * Request body for `POST /auth/token`. The token endpoint refreshes the
 * session and (optionally) downgrades the role set.
 *
 * @category api
 */
export type AuthTokenRequest = {
  roles?: string[]
  ttl?: number
  ips?: string[]
  scope?: string
}

/**
 * Response from `POST /auth/token`.
 *
 * @category api
 */
export type AuthTokenResponse = {
  token: string
}
/**
 * A single rack entry from `GET /auth/list-racks`. Typed loosely — the
 * `listRacks` RPC response shape has not been captured against a live
 * backend yet (staging returned no rack data at verification time).
 *
 * @category api
 */
export type Rack = {
  id?: string
  name?: string
  [key: string]: unknown
}

/**
 * Typed error thrown by the bearer fetcher. `status` mirrors the HTTP status
 * so callers can branch on auth failures without parsing `message`.
 *
 * @category api
 */
export class MdkFetchError extends Error {
  status: number
  body?: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'MdkFetchError'
    this.status = status
    this.body = body
  }
}
