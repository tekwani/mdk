import type { JSX } from 'react'

import { AGENT_LABELS } from '../branding'
import { ChatIcon } from './icons'

export type LauncherFabProps = {
  label?: string
  onClick: VoidFunction
}

/** The collapsed state: a 48px round launcher in the bottom-right corner. */
export const LauncherFab = ({ label = AGENT_LABELS.open, onClick }: LauncherFabProps): JSX.Element => (
  <button type="button" className="mdk-agent-fab" aria-label={label} onClick={onClick}>
    <ChatIcon size={22} />
  </button>
)
