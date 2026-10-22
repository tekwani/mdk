import type { TimelineOption } from '../../line-chart-card/types'

/**
 * Canonical short-form intervals for the dashboard timeline selector.
 *
 * @category dashboard
 * @domain generic
 * @tier advanced
 */
export const DEFAULT_TIMELINE_OPTIONS: readonly TimelineOption[] = [
  { value: '1m', label: '1 Min' },
  { value: '5m', label: '5 Min' },
  { value: '30m', label: '30 Min' },
  { value: '3h', label: '3 H' },
  { value: '1D', label: '1 D' },
] as const

/**
 * Default options for the dashboard timeline selector: 5m / 30m / 3h / 1D.
 * Pass `{ includeOneMinute: true }` when your history route serves a
 * 1-minute bucket.
 *
 * @category dashboard
 * @domain generic
 * @tier advanced
 */
export const getTimelineOptions = (opts: { includeOneMinute?: boolean } = {}): TimelineOption[] => {
  const includeOneMinute = opts.includeOneMinute ?? false
  return includeOneMinute
    ? [...DEFAULT_TIMELINE_OPTIONS]
    : DEFAULT_TIMELINE_OPTIONS.filter((o) => o.value !== '1m').map((o) => ({ ...o }))
}
