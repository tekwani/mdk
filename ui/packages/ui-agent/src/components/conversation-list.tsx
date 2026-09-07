import { Button } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import type { Conversation } from '../core/conversation-store'
import { AGENT_LABELS } from '../branding'
import { formatConversationMeta } from '../core/format'
import { MessagePlusIcon, TrashIcon } from './icons'

export type ConversationListProps = {
  conversations: Conversation[]
  activeId: string | null
  /** The conversation with a turn in flight, if any. */
  runningId?: string | null
  onSelect: (id: string) => void
  onCreate: VoidFunction
  /** Omit to hide the delete affordance entirely. */
  onDelete?: (id: string) => void
}

/**
 * Past conversations, newest first.
 *
 * "Running" is local truth, not server truth: the gateway keeps sessions in
 * memory per process and exposes no way to list them, so the only turn this
 * client can know about is the one it is streaming itself.
 */
export const ConversationList = ({
  conversations,
  activeId,
  runningId = null,
  onSelect,
  onCreate,
  onDelete,
}: ConversationListProps): JSX.Element => {
  // Deleting drops a transcript that exists nowhere else — the gateway keeps no
  // history — so it takes two clicks rather than a modal.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  // A conversation that disappears (deleted elsewhere, or storage cleared) must
  // not leave the row behind it stuck in the confirming state.
  useEffect(() => {
    if (confirmingId && !conversations.some((c) => c.id === confirmingId)) setConfirmingId(null)
  }, [conversations, confirmingId])

  return (
    <div className="mdk-agent-conversations">
      <div className="mdk-agent-conversations__scroll">
        {conversations.length === 0
          ? <p className="mdk-agent-conversations__empty">No conversations yet.</p>
          : null}

        {conversations.map((conversation) => {
          const isRunning = conversation.id === runningId
          const isConfirming = conversation.id === confirmingId

          return (
            <div
              key={conversation.id}
              className={`mdk-agent-conversations__row${
                conversation.id === activeId ? ' mdk-agent-conversations__row--active' : ''
              }`}
            >
              <button
                type="button"
                className="mdk-agent-conversations__open"
                onClick={() => onSelect(conversation.id)}
              >
                <span className="mdk-agent-conversations__title">{conversation.title}</span>
                <span className="mdk-agent-conversations__meta">
                  {formatConversationMeta(conversation.updatedAt, conversation.messages.length)}
                </span>
              </button>

              {isConfirming
                ? (
                    <div className="mdk-agent-conversations__confirm">
                      <button
                        type="button"
                        className="mdk-agent-conversations__confirm-yes"
                        onClick={() => {
                          setConfirmingId(null)
                          onDelete?.(conversation.id)
                        }}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="mdk-agent-conversations__confirm-no"
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )
                : (
                    <>
                      <span
                        className={`mdk-agent-conversations__badge mdk-agent-conversations__badge--${
                          isRunning ? 'running' : 'idle'
                        }`}
                      >
                        {isRunning ? 'Running' : 'Idle'}
                      </span>
                      {onDelete
                        ? (
                            <button
                              type="button"
                              className="mdk-agent-conversations__delete"
                              // Deleting the conversation whose turn is streaming would
                              // strand the open stream with nowhere to write its result.
                              disabled={isRunning}
                              aria-label={`Delete conversation: ${conversation.title}`}
                              onClick={() => setConfirmingId(conversation.id)}
                            >
                              <TrashIcon size={14} />
                            </button>
                          )
                        : null}
                    </>
                  )}
            </div>
          )
        })}
      </div>

      <div className="mdk-agent-conversations__footer">
        <Button
          variant="outline"
          size="sm"
          fullWidth
          icon={<MessagePlusIcon size={16} />}
          onClick={onCreate}
        >
          {AGENT_LABELS.newConversation}
        </Button>
      </div>
    </div>
  )
}
