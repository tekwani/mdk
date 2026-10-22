import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@primitives'

import type { TimelineOption } from '../../line-chart-card/types'
import { getTimelineOptions } from './timeline-options'
import type { JSX } from 'react'

export type TimelineSelectorProps = {
  /** Currently selected timeline value (e.g. `'1m'`, `'5m'`). */
  value: string
  /** Called whenever the user picks a new option. */
  onChange: (next: string) => void
  /**
   * Available options — defaults to {@link getTimelineOptions}. Pass a custom
   * list to localise labels or restrict the range.
   * @default getTimelineOptions()
   */
  options?: TimelineOption[]
  /**
   * ARIA label / placeholder for the trigger.
   * @default "Time range"
   */
  label?: string
  /** Tailwind/BEM class hook on the trigger. */
  className?: string
}

/**
 * Dropdown for picking the dashboard time range. Wraps `core/Select` and the
 * canonical option list from `getTimelineOptions`. Controlled: the page owns
 * the selected timeline and passes it to its queries.
 *
 * @category dashboard
 * @kernelCapability hashrate-monitoring
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * const [timeline, setTimeline] = useState('5m')
 * return <TimelineSelector value={timeline} onChange={setTimeline} />
 * ```
 * @tier agent-ready
 */
export const TimelineSelector = ({
  value,
  onChange,
  options,
  label = 'Time range',
  className,
}: TimelineSelectorProps): JSX.Element => {
  const list = options ?? getTimelineOptions()

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('mdk-timeline-selector', className)} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {list.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

TimelineSelector.displayName = 'TimelineSelector'
