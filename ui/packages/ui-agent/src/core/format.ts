/**
 * Formatting for the conversation list.
 *
 * Deliberately local-time, not the fleet timezone from `timezoneStore`: these
 * are records of when the operator had a conversation in this browser, not
 * telemetry timestamps.
 */

const DAY_MS = 86_400_000

function startOfDay(at: number): number {
  const date = new Date(at)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** `Today` / `Yesterday` / `Jul 28`. */
export function formatDay(at: number, now: number = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY_MS)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** `14:32`, 24-hour so it lines up in a monospace column. */
export function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatMessageCount(count: number): string {
  return count === 1 ? '1 message' : `${count} messages`
}

/**
 * `4 conversations · 1 running` — the header line for the conversations view.
 *
 * "Running" counts only what this client is streaming: the gateway holds
 * sessions in memory per process and exposes no way to list them, so a turn
 * started in another tab is invisible here.
 */
export function formatConversationSummary(count: number, running: boolean): string {
  const conversations = count === 1 ? '1 conversation' : `${count} conversations`
  return running ? `${conversations} · 1 running` : conversations
}

/** `Today · 14:32 · 6 messages` */
export function formatConversationMeta(
  updatedAt: number,
  messageCount: number,
  now?: number,
): string {
  return [formatDay(updatedAt, now), formatClock(updatedAt), formatMessageCount(messageCount)].join(
    ' · ',
  )
}
