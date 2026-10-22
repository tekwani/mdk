/**
 * Runnable example for DashboardDateRangePicker.
 *
 * Demonstrates the `{ start, end }` epoch-millisecond shape the picker
 * reads and emits. The page owns the range and passes it to its queries.
 */
import { DashboardDateRangePicker } from '@tetherto/mdk-react-devkit'
import { useState } from 'react'

export const DashboardDateRangePickerExample = () => {
  const now = Date.now()
  const [range, setRange] = useState({
    start: now - 24 * 60 * 60 * 1000,
    end: now,
  })

  return <DashboardDateRangePicker value={range} onChange={setRange} />
}
