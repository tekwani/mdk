import type { JSX, ReactNode } from 'react'
import { Suspense, useCallback, useState } from 'react'

import type { ToolLabels } from '../core/tool-label'
import type { UseAgentChatOptions } from '../hooks/use-agent-chat'
import { LauncherFab } from '../components/launcher-fab'
import { useAgentChat } from '../hooks/use-agent-chat'
import { LazyCoPilotPanel } from './lazy-panel'

export const COPILOT_POSITION = {
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
} as const

export type CoPilotPosition = (typeof COPILOT_POSITION)[keyof typeof COPILOT_POSITION]

export type CoPilotProps = UseAgentChatOptions & {
  title?: string
  /** The line under the title, e.g. `Local model · 6 tools`. */
  status?: ReactNode
  /** Human labels for tool chips, keyed by the MCP tool name. */
  toolLabels?: ToolLabels
  placeholder?: string
  defaultOpen?: boolean
  position?: CoPilotPosition
  className?: string
}

/**
 * The Co-pilot as a docked overlay: a launcher in the corner that opens the
 * panel over whatever page is showing.
 *
 * Mount it once, in the app root, next to the router outlet:
 *
 * ```tsx
 * import { CoPilot } from '@tetherto/mdk-ui-agent'
 *
 * <div className="app-root">
 *   …
 *   <CoPilot />
 * </div>
 * ```
 *
 * Everything is optional. Inside an `MdkProvider` it picks up the gateway base
 * URL and the bearer token from the provider's auth seam; outside one it falls
 * back to relative URLs and no token, which is what a gateway running without an
 * auth plugin serves anyway.
 */
export const CoPilot = ({
  title,
  status,
  toolLabels,
  placeholder,
  defaultOpen = false,
  position = COPILOT_POSITION.BOTTOM_RIGHT,
  className,
  ...chatOptions
}: CoPilotProps): JSX.Element => {
  const [open, setOpen] = useState(defaultOpen)
  const chat = useAgentChat(chatOptions)

  const close = useCallback(() => setOpen(false), [])
  const openPanel = useCallback(() => setOpen(true), [])

  return (
    <div className={`mdk-agent-root mdk-agent-root--${position}${className ? ` ${className}` : ''}`}>
      {open
        ? (
            <Suspense fallback={<div className="mdk-agent-panel mdk-agent-panel--docked" />}>
              <LazyCoPilotPanel
                chat={chat}
                title={title}
                status={status}
                toolLabels={toolLabels}
                placeholder={placeholder}
                onClose={close}
                className="mdk-agent-panel--docked"
              />
            </Suspense>
          )
        : <LauncherFab onClick={openPanel} />}
    </div>
  )
}
