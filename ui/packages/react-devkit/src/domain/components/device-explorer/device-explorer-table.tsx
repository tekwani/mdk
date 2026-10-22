import { DataTable } from '@primitives'
import type { DataTableColumnDef, DataTableRowSelectionState, DataTableSortingState } from '@primitives'
import { useMemo } from 'react'
import type { DeviceExplorerDeviceData } from './types'
import { getMinerColumns } from './columns/miner-columns'

import type { JSX } from 'react'

export type DeviceExplorerTableProps = {
  /** Rows */
  data: DeviceExplorerDeviceData[]
  /** Table columns. Defaults to the miner columns ({@link getMinerColumns}). */
  columns?: DataTableColumnDef<DeviceExplorerDeviceData>[]
  selections: DataTableRowSelectionState
  onSelectionsChange: (selections: DataTableRowSelectionState) => void
  /** Date formatter from the host's timezone setup; used by the default miner columns */
  getFormattedDate: (date: Date) => string
  sorting: DataTableSortingState
  onSortingChange: (sorting: DataTableSortingState) => void
  /** Called when a row is clicked (e.g. to open the device's detail page). */
  onRowClick?: (device: DeviceExplorerDeviceData) => void
}

export const DeviceExplorerTable = ({
  data,
  columns: providedColumns,
  selections,
  onSelectionsChange,
  getFormattedDate,
  sorting,
  onSortingChange,
  onRowClick,
}: DeviceExplorerTableProps): JSX.Element => {
  const columns = useMemo(
    () => providedColumns ?? getMinerColumns({ getFormattedDate }),
    [providedColumns, getFormattedDate],
  )

  return (
    <DataTable
      data={data}
      columns={columns}
      enableRowSelection
      // Key rows by the device id (not the default row index) so a selection —
      // and any `?thing=<id>` deep-link that maps onto it — survives sorting and
      // filtering, and so the host can resolve a selected row back to its thing.
      getRowId={(row) => row.id}
      selections={selections}
      onSelectionsChange={onSelectionsChange}
      wrapperClassName="mdk-device-explorer__table"
      sorting={sorting}
      onSortingChange={onSortingChange}
      onRowClick={onRowClick}
    />
  )
}
