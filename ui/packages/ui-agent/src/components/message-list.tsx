import type { JSX } from 'react'
import { useCallback, useEffect, useRef } from 'react'

import type { ChatMessage } from '../core/conversation-store'
import type { ToolLabels } from '../core/tool-label'
import type { AgentTurnState, PendingApproval } from '../core/turn'
import { MESSAGE_ROLE } from '../core/conversation-store'
import { TURN_STATUS } from '../core/turn'
import { AssistantMessage } from './assistant-message'
import { SystemMessage } from './system-message'
import { UserMessage } from './user-message'

/** How close to the bottom still counts as "following along", in pixels. */
const PIN_THRESHOLD_PX = 48

/**
 * The operator message an assistant reply answers: the nearest user message above it.
 *
 * A turn can leave several assistant entries behind, so this is a scan rather than
 * `messages[index - 1]`. Read only to tell a fleet question from a greeting.
 */
function precedingQuestion(messages: ChatMessage[], index: number): string {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const message = messages[cursor]
    if (message?.role === MESSAGE_ROLE.USER) return message.text
  }
  return ''
}

export type MessageListProps = {
  messages: ChatMessage[]
  live: AgentTurnState | null
  toolLabels?: ToolLabels
  pendingApproval: PendingApproval | null
  isDecisionPending: boolean
  onDecide: (approved: boolean) => void
  /** Re-asks the last question. Offered on the newest failed turn only. */
  onRetry?: VoidFunction
}

/**
 * The transcript, pinned to the bottom while the operator is following along.
 *
 * There is no `ScrollArea` primitive in the devkit and `@radix-ui/react-scroll-area`
 * is not a dependency, so this is a plain overflow container. The pinning rule
 * matters more than the chrome: scrolling up to re-read an earlier answer must
 * not be undone by the next token arriving.
 */
export const MessageList = ({
  messages,
  live,
  toolLabels,
  pendingApproval,
  isDecisionPending,
  onDecide,
  onRetry,
}: MessageListProps): JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  const handleScroll = useCallback(() => {
    const node = scrollRef.current
    if (!node) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    pinnedRef.current = distance <= PIN_THRESHOLD_PX
  }, [])

  // Depends on the streamed length rather than the state object so it also fires
  // while tokens land inside one unchanged turn.
  const liveLength = live ? live.text.length + live.tools.length : 0

  useEffect(() => {
    const node = scrollRef.current
    if (!node || !pinnedRef.current) return
    node.scrollTop = node.scrollHeight
  }, [messages.length, liveLength, pendingApproval])

  const isEmpty = messages.length === 0 && live === null
  // Retrying an older turn would send it as the newest question, so only the last
  // message is offered the affordance — and never while a turn is running.
  const retryableId
    = live === null && onRetry ? (messages.at(-1)?.error ? messages.at(-1)?.id : undefined) : undefined

  return (
    /* `aria-live` so an answer, and the approval prompt in particular, reaches a
       screen reader as it arrives — nothing else moves focus into the transcript. */
    <div
      className="mdk-agent-messages"
      ref={scrollRef}
      aria-live="polite"
      aria-busy={live !== null}
      onScroll={handleScroll}
    >
      {isEmpty
        ? (
            <p className="mdk-agent-messages__empty">
              Ask about your fleet — device status, telemetry, or an action to run.
            </p>
          )
        : null}

      {messages.map((message, index) => {
        if (message.role === MESSAGE_ROLE.USER) {
          return <UserMessage key={message.id} text={message.text} />
        }
        if (message.role === MESSAGE_ROLE.SYSTEM) {
          return <SystemMessage key={message.id} text={message.text} />
        }
        return (
          <AssistantMessage
            key={message.id}
            text={message.text}
            question={precedingQuestion(messages, index)}
            tools={message.tools}
            error={message.error}
            interrupted={message.interrupted}
            toolLabels={toolLabels}
            {...(message.id === retryableId && onRetry ? { onRetry } : {})}
          />
        )
      })}

      {live
        ? (
            <AssistantMessage
              text={live.text}
              question={precedingQuestion(messages, messages.length)}
              tools={live.tools}
              error={live.error}
              streaming={live.status !== TURN_STATUS.COMPLETE && live.status !== TURN_STATUS.ERROR}
              toolLabels={toolLabels}
              approval={pendingApproval}
              isDecisionPending={isDecisionPending}
              onDecide={onDecide}
            />
          )
        : null}
    </div>
  )
}
