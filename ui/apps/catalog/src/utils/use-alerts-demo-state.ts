import { useCallback, useState } from 'react'

import type { AlertLocalFilters, HistoricalAlertsRange } from '@tetherto/mdk-react-devkit/domain'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_RANGE_DAYS = 14

/**
 * Search tag that pins the alerts tables to one device. Same format the
 * tables' tag search matches on (`id-<deviceId>`).
 */
const toDeviceTag = (deviceId: string): string => `id-${deviceId}`

/**
 * The state `CurrentAlerts` and `HistoricalAlerts` share on an alerts page: the
 * severity/type filters, the search tag chips, the historical date range and
 * the selected alert. Both components are controlled, so the page owns this and
 * hands it to each.
 *
 * `onAlertClick` selects the alert and narrows both tables to its device.
 */
export const useAlertsDemoState = () => {
  const [localFilters, setLocalFilters] = useState<AlertLocalFilters>({})
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [selectedAlertId, setSelectedAlertId] = useState<string>()
  const [dateRange, setDateRange] = useState<HistoricalAlertsRange>(() => {
    const end = Date.now()
    return { start: end - DEFAULT_RANGE_DAYS * DAY_MS, end }
  })

  const onAlertClick = useCallback((deviceId?: string, alertId?: string): void => {
    if (deviceId) setFilterTags([toDeviceTag(deviceId)])
    setSelectedAlertId(alertId)
  }, [])

  return {
    localFilters,
    setLocalFilters,
    filterTags,
    setFilterTags,
    dateRange,
    setDateRange,
    selectedAlertId,
    setSelectedAlertId,
    onAlertClick,
  }
}
