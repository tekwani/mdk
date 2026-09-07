/**
 * The agent event contract, redeclared for the browser.
 *
 * The producer of record is `backend/core/agent/src/events.js`. That module is
 * Node-only ESM inside a private package with no `exports` map, and importing it
 * would pull the model provider and the MCP client into the bundle — so the six
 * events are restated here instead. `src/core/events.contract.test.ts` reads the
 * backend file and fails if the two ever drift.
 */

import isPlainObject from 'lodash/isPlainObject'

/** Bump only alongside the producer's `CONTRACT_VERSION`. */
export const AGENT_CONTRACT_VERSION = 'v1'

/** Reference these constants, never the raw strings, so a typo is a type error. */
export const EVENT = {
  TOKEN: 'token',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  PENDING_APPROVAL: 'pending_approval',
  ERROR: 'error',
  DONE: 'done',
} as const

export type EventType = (typeof EVENT)[keyof typeof EVENT]

/** `done` and `error` only. Exactly one of them ends a turn, and it is always last. */
export const TERMINAL_EVENTS = [EVENT.DONE, EVENT.ERROR] as const

export type TerminalEventType = (typeof TERMINAL_EVENTS)[number]

export type ToolArgs = Record<string, unknown>

/** A chunk of the answer, to append to the open bubble. */
export type TokenEvent = { type: typeof EVENT.TOKEN, text: string }

/** The model chose a tool. Always followed by a `tool_result` with the same `name`. */
export type ToolCallEvent = { type: typeof EVENT.TOOL_CALL, name: string, args: ToolArgs }

/**
 * The tool answered. `isError` means the call itself failed; `contractViolation`
 * — which the producer only ever emits together with `isError` — means the tool
 * answered but the answer broke its verb's contract.
 */
export type ToolResultEvent = {
  type: typeof EVENT.TOOL_RESULT
  name: string
  text: string
  isError?: boolean
  contractViolation?: string
  /**
   * How long the operator held the turn at the approval prompt, on a gated call only.
   * Subtract it before showing a duration: the gap between a `tool_call` and its
   * `tool_result` spans the wait, so a card left open for a minute reads as a minute
   * of tool.
   */
  approvalWaitMs?: number
}

/** A write tool is waiting on the operator. The stream PAUSES here. */
export type PendingApprovalEvent = {
  type: typeof EVENT.PENDING_APPROVAL
  name: string
  args: ToolArgs
}

/** Terminal. Distinct from a decline, which is tokens + `done` with no `tool_call`. */
export type ErrorEvent = { type: typeof EVENT.ERROR, error: string }

/** Terminal. */
export type DoneEvent = {
  type: typeof EVENT.DONE
  text?: string
  usage?: Record<string, unknown>
}

export type AgentEvent =
  | TokenEvent
  | ToolCallEvent
  | ToolResultEvent
  | PendingApprovalEvent
  | ErrorEvent
  | DoneEvent

/**
 * What actually arrives on the wire: the event's own fields with the gateway's
 * envelope spread onto the same flat object, not nested under a key.
 */
export type WireEvent = AgentEvent & {
  /** Correlates every event of one turn. */
  turnId: string
  /** Monotonic per turn — ordering and dedup. */
  seq: number
  /** Stamped by the gateway on every event, despite being optional in the docs. */
  ts: number
  /** Present ONLY on `pending_approval`. Echo it back to decide. */
  approvalId?: string
}

const EVENT_TYPES = new Set<string>(Object.values(EVENT))
const TERMINAL_TYPES = new Set<string>(TERMINAL_EVENTS)

export function isTerminal(event: Pick<AgentEvent, 'type'>): boolean {
  return TERMINAL_TYPES.has(event.type)
}

/**
 * Structural check only — enough to decide whether we know how to render it.
 *
 * Contract invariant 5: unknown event types MUST be ignored, not thrown on. That
 * is what lets the producer add event types without a breaking release, so this
 * returns false rather than raising.
 */
export function isAgentEvent(value: unknown): value is AgentEvent {
  // Every event arrives from `JSON.parse`, so a plain object is exactly the shape
  // to accept — anything else on the wire is malformed by definition.
  if (!isPlainObject(value)) return false
  const type = (value as { type?: unknown }).type
  return typeof type === 'string' && EVENT_TYPES.has(type)
}

export function isWireEvent(value: unknown): value is WireEvent {
  if (!isAgentEvent(value)) return false
  const { turnId, seq } = value as Partial<WireEvent>
  return typeof turnId === 'string' && typeof seq === 'number'
}
