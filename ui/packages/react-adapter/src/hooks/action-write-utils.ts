/**
 * Shared helpers for the voting/approval write hooks
 * (`useSubmitPendingActions`, `useSubmitSingleAction`, `useVoteOnAction`,
 * `useCancelAction`). Centralises the API payload whitelist, embedded-error
 * detection, and post-write cache invalidation so the four hooks stay aligned.
 */

import {
  AUTH_LEVELS,
  AUTH_PERMISSIONS,
  type PendingSubmissionAction,
  type VotingActionPayload,
} from '@tetherto/mdk-ui-foundation'
import type { QueryClient } from '@tanstack/react-query'

/** Capability required to submit / vote / cancel actions. */
export const ACTIONS_WRITE_PERM = `${AUTH_PERMISSIONS.ACTIONS}:${AUTH_LEVELS.WRITE}`

/** Server error code embedded in a 200 response when the user lacks permission. */
const ERR_KERNEL_ACTION_CALLS_EMPTY = 'ERR_KERNEL_ACTION_CALLS_EMPTY'
const PERMISSION_ERROR_MSG = 'This user role is not authorized to submit this action'

/**
 * Project a staged queue action onto the exact `POST /auth/actions/voting`
 * body. The backend body schema recognises only `query`, `action`, `params`
 * and `rackType` (and `required: ['query','action','params']`); the local
 * queue `id` and every client-only field (`tags`, `crossThing`, `codesList`,
 * `poolName`, …) is dropped so it never reaches the API.
 *
 * Targeting reaches the backend solely through `query`. A staged action holds
 * its targets as `tags` (device ids / container tags); unless it opts out with
 * `overrideQuery: false` (pool assignment stages an explicit `query`), the
 * query is built from those tags as `{ tags: { $in: tags } }`. This mirrors
 * the MOS submit path — device actions stage `tags` with no `query`, and
 * without this conversion they would POST no `query` and be rejected with a
 * 400.
 */
export const toVotingPayload = (action: PendingSubmissionAction): VotingActionPayload => {
  const payload: VotingActionPayload = {}
  if (action.action !== undefined) payload.action = action.action
  if (action.params !== undefined) payload.params = action.params as VotingActionPayload['params']
  if (action.rackType !== undefined) payload.rackType = action.rackType as string

  if (action.overrideQuery === false && action.query !== undefined) {
    payload.query = action.query as Record<string, unknown>
  } else {
    payload.query = { tags: { $in: action.tags ?? [] } }
  }

  return payload
}

/**
 * Inspect a 200 response body for embedded errors — the API returns an array
 * where each element may carry an `errors` field even on HTTP 200. Returns the
 * surfaced error message, or `null` when the response is clean.
 */
export const extractSubmitError = (data: unknown): string | null => {
  if (!Array.isArray(data) || data.length === 0) return null
  const head = data[0] as Record<string, unknown> | undefined
  const errors = head?.errors
  if (Array.isArray(errors) && (errors as string[]).includes(ERR_KERNEL_ACTION_CALLS_EMPTY)) {
    return PERMISSION_ERROR_MSG
  }
  if (Array.isArray(errors) && errors.length > 0) return String(errors[0])
  if (typeof errors === 'string' && errors.length > 0) return errors
  return null
}

/**
 * Query-key prefixes refreshed after any action write (submit / vote / cancel).
 * A write can change pool configs, miner assignments, the aggregated pools, and
 * the actions queue, so all four are invalidated together for consistency.
 */
const ACTION_WRITE_INVALIDATE_PREFIXES = [
  ['auth', 'configs', 'pool'],
  ['auth', 'miners'],
  ['auth', 'pools'],
  ['auth', 'actions'],
] as const

/** Live-actions key — refetched (not just invalidated) so new cards appear at once. */
const LIVE_ACTIONS_KEY = ['auth', 'actions', 'live'] as const

/**
 * Invalidate every cache a successful action write can affect, then force an
 * immediate refetch of the live-actions feed so the new card shows up without
 * waiting for the passive poll.
 */
export const invalidateAfterActionWrite = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all(
    ACTION_WRITE_INVALIDATE_PREFIXES.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey: [...queryKey] }),
    ),
  )
  await queryClient.refetchQueries({ queryKey: [...LIVE_ACTIONS_KEY] })
}
