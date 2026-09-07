/**
 * @tetherto/mdk-ui-agent
 *
 * The operator Co-pilot, as a drop-in for any MDK UI shell. Talks to the agent
 * gateway plugin (`@tetherto/mdk-plugin-agent`) over SSE and renders its
 * six-event contract as a conversation.
 *
 * ```tsx
 * import { CoPilot } from '@tetherto/mdk-ui-agent'
 * import '@tetherto/mdk-ui-agent/styles.css'
 *
 * <CoPilot />
 * ```
 *
 * `CoPilotPanel` is deliberately NOT exported here — it is reachable from
 * `@tetherto/mdk-ui-agent/panel`. Both entries load it through a lazy boundary
 * so the markdown renderer and syntax highlighter stay out of the host's first
 * paint, and a single static import from this barrel would collapse that split
 * for every consumer.
 */

export { AGENT_LABELS, AGENT_NAME, OPERATOR_NAME } from './branding'
export * from './core'
export type { ChatUIEntryProps } from './entries/chat-page'

export { ChatUIEntry } from './entries/chat-page'
export type { CoPilotPosition, CoPilotProps } from './entries/co-pilot'

export { CoPilot, COPILOT_POSITION } from './entries/co-pilot'
export * from './hooks'
