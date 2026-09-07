/**
 * The product name, in one place.
 *
 * "Co-pilot" is a placeholder — it collides with GitHub Copilot and the final
 * name has not been decided. Every user-visible string in the package derives
 * from `AGENT_NAME` below, so renaming it is a one-line change here.
 *
 * Deliberately kept out of the identifiers: the package is `@tetherto/mdk-ui-agent`,
 * the CSS classes are `mdk-agent-*`, and the storage key is `mdk-ui-agent:*`.
 * None of those need to move when the name does. The exported component names
 * (`CoPilot`, `CoPilotProps`, …) are the only remaining mention, and they are a
 * mechanical rename plus a deprecated alias whenever the decision lands.
 *
 * Hosts that want a different name per deployment do not need to fork this:
 * pass `title` to `CoPilot` / `ChatUIEntry`.
 */

export const AGENT_NAME = 'Co-pilot'

/** How the operator's own turns are labelled. */
export const OPERATOR_NAME = 'Operator'

const lower = AGENT_NAME.toLowerCase()

/**
 * Accessible names and headings, derived so they stay consistent with
 * {@link AGENT_NAME}.
 */
export const AGENT_LABELS = {
  name: AGENT_NAME,
  operator: OPERATOR_NAME,
  open: `Open ${lower}`,
  close: `Close ${lower}`,
  composer: `Message the ${lower}`,
  conversations: 'Conversations',
  newConversation: 'New conversation',
  backToConversation: 'Back to conversation',
  approvalRequired: 'Approval required',
  placeholder: 'Ask about your fleet...',
} as const
