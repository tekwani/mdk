import _map from 'lodash/map'

import { cn, formatErrors, formatNumber, SimpleTooltip, unitToKilo } from '@primitives'
import type { ErrorWithTimestamp } from '@primitives'

import { useTimezoneFormatter } from '@tetherto/mdk-react-adapter'
import { AlarmInfo } from './alarm-info'
import type { AlarmInfoItem } from './alarm-info'

import type { JSX, ReactNode } from 'react'

/** One alarm category badge: a title, an icon, and the alerts behind it. */
export type WidgetAlarmGroup = {
  /** Category label; the tooltip heading reads `<title> issues` */
  title: string
  /** Badge icon */
  icon: ReactNode
  /** Active alerts in this category; the badge is hidden when empty */
  items?: AlarmInfoItem[]
}

export type WidgetTopRowProps = {
  /** Widget title */
  title: string
  /** Power reading; rendered in kilo-units */
  power?: number
  /** Power unit (e.g. `"kW"`) */
  unit?: string
  /** Error tooltip content; replaces power */
  statsErrorMessage?: string | ErrorWithTimestamp[] | null
  /** Alarm category badges, in display order. Categories with no items render nothing. */
  alarms?: WidgetAlarmGroup[]
  /** Additional class names */
  className?: string
}

/**
 * Compact header row used at the top of container / miner widgets — shows the
 * title, one badge per alarm category you pass, and the current power reading
 * (or an error tooltip).
 *
 * @category widgets
 * @kernelCapability device-telemetry
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <WidgetTopRow
 *   title="Container A"
 *   power={power}
 *   unit="kW"
 *   alarms={[{ title: 'Pressure', icon: <PressureAlarmIcon />, items: pressureAlerts }]}
 * />
 * ```
 * @tier agent-ready
 */
export const WidgetTopRow = ({
  title,
  power,
  unit,
  statsErrorMessage,
  alarms,
  className,
}: WidgetTopRowProps): JSX.Element => {
  const { getFormattedDate } = useTimezoneFormatter()

  const powerLabel = power ? (
    <>
      {formatNumber(unitToKilo(power))}
      &nbsp;
      <span>{unit}</span>
    </>
  ) : null

  return (
    <div className={cn('mdk-widget-top-row', className)}>
      <div className="mdk-widget-top-row__inner">
        <div className="mdk-widget-top-row__title">{title}</div>
        {_map(alarms, (group: WidgetAlarmGroup) => (
          <AlarmInfo title={group.title} icon={group.icon} items={group.items} key={group.title} />
        ))}
        <div className="mdk-widget-top-row__power">
          {statsErrorMessage ? (
            <SimpleTooltip content={formatErrors(statsErrorMessage, getFormattedDate)}>
              <span>-</span>
            </SimpleTooltip>
          ) : (
            powerLabel
          )}
        </div>
      </div>
    </div>
  )
}

WidgetTopRow.displayName = 'WidgetTopRow'
