import { Button } from '@tetherto/mdk-react-devkit/primitives'
import isNil from 'lodash/isNil'
import type { JSX } from 'react'

import type { ToolLabels } from '../core/tool-label'
import type { PendingApproval } from '../core/turn'
import { AGENT_LABELS } from '../branding'
import { humanizeToolName, toolLabel } from '../core/tool-label'

/** Args the reference site tools use to name their target, most specific first. */
const TARGET_KEYS = ['ref', 'deviceId', 'device', 'id', 'name'] as const

/**
 * Friendlier names for argument keys the reference tools use.
 *
 * `action` matters most: without it the card shows two rows both labelled
 * "Action" — the tool itself, and the tool's `action` argument — which is what
 * the design calls "Command". Anything not listed is humanized from its key.
 */
const ARG_LABELS: Record<string, string> = {
  action: 'Command',
  mode: 'Mode',
  family: 'Family',
  state: 'State',
}

/** Shown for an argument the tool declared but sent no value for. */
const EMPTY_VALUE = '—'

const describeValue = (value: unknown): string => {
  if (isNil(value)) return EMPTY_VALUE
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export type ApprovalRow = { label: string, value: string }

/**
 * Flattens the tool args into the Action / Device / Command rows the design
 * shows.
 *
 * Tools are supplied by whichever MCP server the operator points the agent at,
 * so no argument name is guaranteed. The target is looked up across the names
 * the reference tools use and everything else is listed as-is, which degrades to
 * a plain key/value dump for an unknown tool rather than to nothing.
 */
export function describeApproval(approval: PendingApproval, labels?: ToolLabels): ApprovalRow[] {
  const rows: ApprovalRow[] = [{ label: 'Action', value: toolLabel(approval.name, labels) }]

  const targetKey = TARGET_KEYS.find((key) => key in approval.args)
  if (targetKey) rows.push({ label: 'Device', value: describeValue(approval.args[targetKey]) })

  for (const [key, value] of Object.entries(approval.args)) {
    if (key === targetKey) continue
    rows.push({ label: ARG_LABELS[key] ?? humanizeToolName(key), value: describeValue(value) })
  }

  return rows
}

/**
 * The one-line "here is what you are about to allow", shown above the card.
 *
 * Synthesized rather than streamed: `pending_approval` arrives between a
 * `tool_call` and its `tool_result`, and the model does not emit a single token
 * until after the tool returns — so at the moment the operator is asked to
 * decide, the agent has said nothing at all. The design shows a sentence there,
 * and it has to be built from the call itself.
 */
export function describeApprovalIntent(approval: PendingApproval, labels?: ToolLabels): string {
  const action = toolLabel(approval.name, labels).toLowerCase()
  const targetKey = TARGET_KEYS.find((key) => key in approval.args)
  const target = targetKey ? describeValue(approval.args[targetKey]) : null

  return target
    ? `This runs ${action} on ${target}. Review and approve to proceed.`
    : `This runs ${action}. Review and approve to proceed.`
}

export type ApprovalCardProps = {
  approval: PendingApproval
  toolLabels?: ToolLabels
  /** A decision has been sent; the stream has not resumed yet. */
  pending?: boolean
  onDecide: (approved: boolean) => void
}

/**
 * The inline approval prompt. The stream is paused behind this.
 *
 * Rendered in the transcript rather than as a blocking modal, because it is not
 * always the operator who resolves it: an approval left unanswered for
 * `agent.approvalTimeoutMs` is auto-rejected server-side and the stream resumes
 * on its own. The card must be able to disappear because the turn moved on — a
 * modal that only closes on click would strand the operator on a dead prompt.
 * Unmounting is driven by the reducer clearing `pendingApproval`.
 */
export const ApprovalCard = ({
  approval,
  toolLabels,
  pending = false,
  onDecide,
}: ApprovalCardProps): JSX.Element => {
  const rows = describeApproval(approval, toolLabels)

  return (
    <section className="mdk-agent-approval" aria-label={AGENT_LABELS.approvalRequired}>
      <h3 className="mdk-agent-approval__title">{AGENT_LABELS.approvalRequired}</h3>

      <dl className="mdk-agent-approval__details">
        {rows.map((row) => (
          <div className="mdk-agent-approval__row" key={row.label}>
            <dt className="mdk-agent-approval__label">{row.label}</dt>
            <dd className="mdk-agent-approval__value">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mdk-agent-approval__actions">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => onDecide(false)}
        >
          Reject
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={pending}
          disabled={pending}
          onClick={() => onDecide(true)}
        >
          Approve
        </Button>
      </div>
    </section>
  )
}
