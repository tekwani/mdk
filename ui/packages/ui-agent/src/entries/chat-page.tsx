import type { JSX, ReactNode } from 'react'
import { Suspense } from 'react'

import type { ToolLabels } from '../core/tool-label'
import type { UseAgentChatOptions } from '../hooks/use-agent-chat'
import { useAgentChat } from '../hooks/use-agent-chat'
import { LazyCoPilotPanel } from './lazy-panel'

export type ChatUIEntryProps = UseAgentChatOptions & {
  title?: string
  status?: ReactNode
  toolLabels?: ToolLabels
  placeholder?: string
  className?: string
}

/**
 * The same conversation as {@link CoPilot}, rendered as a full-height page
 * instead of a docked overlay.
 *
 * Zero required props and a default export, so it drops straight into the
 * shell's lazy route registry:
 *
 * ```ts
 * { path: '/chat', label: 'Co-pilot', page: () => import('@tetherto/mdk-ui-agent/chat-page') }
 * ```
 *
 * The panel is loaded through the shared lazy boundary rather than imported
 * directly — a static edge here would pull the transcript and its markdown
 * renderer into the root barrel, undoing the split for `CoPilot` as well.
 */
export const ChatUIEntry = ({
  title,
  status,
  toolLabels,
  placeholder,
  className,
  ...chatOptions
}: ChatUIEntryProps): JSX.Element => {
  const chat = useAgentChat(chatOptions)

  return (
    <Suspense fallback={<div className="mdk-agent-panel mdk-agent-panel--page" />}>
      <LazyCoPilotPanel
        chat={chat}
        title={title}
        status={status}
        toolLabels={toolLabels}
        placeholder={placeholder}
        className={`mdk-agent-panel--page${className ? ` ${className}` : ''}`}
      />
    </Suspense>
  )
}

export default ChatUIEntry
