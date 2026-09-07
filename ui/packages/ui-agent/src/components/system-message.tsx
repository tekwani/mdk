import type { JSX } from 'react'
import { memo } from 'react'

export type SystemMessageProps = {
  text: string
}

/**
 * A note from the panel itself, not from the model.
 *
 * Used where the transcript would otherwise imply something untrue — most of all
 * a re-minted session, where the conversation reads as continuous but the agent
 * remembers none of it.
 */
const SystemMessageView = ({ text }: SystemMessageProps): JSX.Element => (
  <p className="mdk-agent-system" role="note">{text}</p>
)

export const SystemMessage = memo(SystemMessageView)
