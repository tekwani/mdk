import { cn } from '@primitives'
import type { DataTableRowSelectionState, DataTableSortingState, LocalFilters } from '@primitives'
import { DeviceExplorerTable } from './device-explorer-table'
import type { DeviceExplorerTableProps } from './device-explorer-table'
import { DeviceExplorerToolbar } from './device-explorer-toolbar'
import type { DeviceExplorerToolbarProps } from './device-explorer-toolbar'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useFilterState } from './hooks/use-filter-state'
import { useState } from 'react'
import type { JSX } from 'react'

type OmittedToolbarProps = 'onFiltersChange' | 'filters'
type OptionalToolbarProps = 'filters'
type ForwardedToolbarProps = {
  /** Setter for filters */
  onFiltersChange: (value: LocalFilters) => void
} & Omit<DeviceExplorerToolbarProps, OmittedToolbarProps> &
  Partial<Pick<DeviceExplorerToolbarProps, OptionalToolbarProps>>

type OmittedTableProps = 'selections' | 'onSelectionsChange' | 'sorting' | 'onSortingChange'
type OptionalTableProps = 'onSortingChange'
type ForwardedTableProps = Partial<Pick<DeviceExplorerTableProps, OptionalTableProps>> &
  Omit<DeviceExplorerTableProps, OmittedTableProps>

export type DeviceExplorerProps = {
  /** Additional class names */
  className?: string
  /** Controlled row-selection state */
  selectedDevices?: DataTableRowSelectionState
  /** Setter for row selection */
  onSelectedDevicesChange?: (selections: DataTableRowSelectionState) => void
} & ForwardedToolbarProps &
  ForwardedTableProps

/**
 * Device explorer: filter + search toolbar over a sortable, selectable device
 * table. Shows the miner columns by default; pass `columns` to change them
 * (spread `getMinerColumns(...)` to extend the default set). Designed to be
 * controlled by URL state in the host app.
 *
 * @category tables
 * @kernelCapability device-management
 * @domain device-management
 *
 * @example
 * ```tsx
 * <DeviceExplorer
 *   data={devices}
 *   filterOptions={filterOptions}
 *   searchOptions={searchOptions}
 *   searchTags={searchTags}
 *   onSearchTagsChange={setSearchTags}
 *   onFiltersChange={setFilters}
 *   getFormattedDate={(date) => formatDate(date)}
 * />
 * ```
 * @tier agent-ready
 */
export const DeviceExplorer = ({
  filters: providedFilters,
  onFiltersChange,
  filterOptions,
  searchOptions,
  data,
  columns,
  selectedDevices,
  onSelectedDevicesChange,
  searchTags,
  onSearchTagsChange,
  className,
  getFormattedDate,
  onRowClick,
}: DeviceExplorerProps): JSX.Element => {
  const [selections, setSelections] = useControllableState<DataTableRowSelectionState>({
    prop: selectedDevices,
    defaultProp: {},
    onChange: onSelectedDevicesChange,
  })

  const { filters, onFiltersChange: handleFilterChange } = useFilterState({
    filters: providedFilters,
    onFiltersChange,
  })

  const [sorting, setSorting] = useState<DataTableSortingState>([])


  return (
    <div className={cn('mdk-device-explorer', className)}>
      <DeviceExplorerToolbar
        filters={filters}
        filterOptions={filterOptions}
        onFiltersChange={handleFilterChange}
        searchOptions={searchOptions}
        searchTags={searchTags}
        onSearchTagsChange={onSearchTagsChange}
      />
      <DeviceExplorerTable
        data={data}
        columns={columns}
        selections={selections}
        onSelectionsChange={setSelections}
        getFormattedDate={getFormattedDate}
        sorting={sorting}
        onSortingChange={setSorting}
        onRowClick={onRowClick}
      />
    </div>
  )
}
