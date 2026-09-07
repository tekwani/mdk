import type { JSX } from 'react'
import { memo } from 'react'

import type { ToolLabels } from '../core/tool-label'
import type { ToolStep } from '../core/turn'
import { formatDuration, toolLabel } from '../core/tool-label'
import { TOOL_STATUS } from '../core/turn'
import { CloseIcon, TickIcon, WarningIcon } from './icons'

export type ToolChipProps = {
  step: ToolStep
  toolLabels?: ToolLabels
}

/**
 * One tool call, as the small pill above an answer: `✓ Site status · 0.4s`.
 *
 * Showing tool activity is not decoration. Model routing is the weak point of
 * the stack — a turn that answers without ever calling a tool is answering from
 * the prompt, not from the fleet — so the chips are what make that visible
 * instead of mysterious.
 */
const ToolChipView = ({ step, toolLabels }: ToolChipProps): JSX.Element => {
  const duration = formatDuration(step.durationMs)
  const label = toolLabel(step.name, toolLabels)

  const detail
    = step.status === TOOL_STATUS.AWAITING_APPROVAL
      ? 'awaiting approval'
      : step.status === TOOL_STATUS.RUNNING
        ? 'running…'
        : step.status === TOOL_STATUS.REJECTED
          // Deliberately no duration: nothing ran, so there is nothing to time.
          ? 'not run'
          // The turn ended before the result came back, so whether it ran is unknown
          // — and the elapsed time would measure the failure, not the tool.
          : step.status === TOOL_STATUS.INTERRUPTED
            ? 'no result'
            : duration

  return (
    <span
      className={`mdk-agent-tool-chip mdk-agent-tool-chip--${step.status}`}
      title={step.contractViolation ?? step.text ?? label}
    >
      <span className="mdk-agent-tool-chip__icon" aria-hidden="true">
        {step.status === TOOL_STATUS.OK ? <TickIcon size={12} /> : null}
        {step.status === TOOL_STATUS.ERROR ? <WarningIcon size={12} /> : null}
        {step.status === TOOL_STATUS.REJECTED ? <CloseIcon size={12} /> : null}
        {step.status === TOOL_STATUS.INTERRUPTED ? <WarningIcon size={12} /> : null}
      </span>
      <span className="mdk-agent-tool-chip__label">{label}</span>
      {detail ? <span className="mdk-agent-tool-chip__detail">{`· ${detail}`}</span> : null}
    </span>
  )
}

export const ToolChip = memo(ToolChipView)
