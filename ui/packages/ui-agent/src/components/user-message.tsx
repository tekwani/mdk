import type { JSX } from 'react'
import { memo } from 'react'

import { AGENT_LABELS } from '../branding'

export type UserMessageProps = {
  text: string
}

/** Right-aligned operator turn: an `OPERATOR` caption above a bordered bubble. */
const UserMessageView = ({ text }: UserMessageProps): JSX.Element => (
  <div className="mdk-agent-message mdk-agent-message--user">
    <p className="mdk-agent-message__role">{AGENT_LABELS.operator}</p>
    <div className="mdk-agent-message__bubble">{text}</div>
  </div>
)

export const UserMessage = memo(UserMessageView)
