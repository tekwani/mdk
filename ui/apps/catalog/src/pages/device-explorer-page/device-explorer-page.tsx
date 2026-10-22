import { Button } from '@tetherto/mdk-react-devkit/primitives'
import type {
  DataTableColumnDef,
  DataTableRowSelectionState,
  LocalFilters,
} from '@tetherto/mdk-react-devkit/primitives'
import { DeviceExplorer, getMinerColumns } from '@tetherto/mdk-react-devkit/domain'
import type { DeviceExplorerDeviceData } from '@tetherto/mdk-react-devkit/domain'
import { useMemo, useState } from 'react'
import type { JSX } from 'react'

import { DemoBlock } from '../../components/demo-block'
import { DemoPageHeader } from '../../components/demo-page-header'
import { useDemoToast } from '../../utils/use-demo-toast'

import { minersData } from './mock-data'

const FILTER_OPTIONS = [
  {
    value: 'status',
    label: 'Status',
    children: [
      { value: 'online', label: 'Online' },
      { value: 'offline', label: 'Offline' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'error', label: 'Error' },
    ],
  },
]

const SEARCH_OPTIONS = [
  { value: 'search-option-1', label: 'Search Option 1' },
  { value: 'search-option-2', label: 'Search Option 2' },
]

const formatDate = (date: Date): string => date.toISOString()

export const DeviceExplorerPage = (): JSX.Element => {
  const [searchTags, setSearchTags] = useState<string[]>([])
  const { showToast, ToasterSlot } = useDemoToast()

  /* The default miner columns plus one of our own: an action cell per row. */
  const columnsWithAction = useMemo<DataTableColumnDef<DeviceExplorerDeviceData>[]>(
    () => [
      ...getMinerColumns({ getFormattedDate: formatDate }),
      {
        id: 'action',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" onClick={() => showToast(`Action on ${row.original.id}`)}>
            Action
          </Button>
        ),
      },
    ],
    [showToast],
  )

  const sharedProps = {
    data: minersData,
    searchOptions: SEARCH_OPTIONS,
    searchTags,
    onSearchTagsChange: setSearchTags,
    filterOptions: FILTER_OPTIONS,
    onFiltersChange: (value: LocalFilters) => console.warn('new filters: ', value),
    onSelectedDevicesChange: (selections: DataTableRowSelectionState) =>
      console.warn('new selections: ', selections),
    getFormattedDate: formatDate,
  }

  return (
    <div>
      <DemoPageHeader
        title="Device Explorer"
        description="Filter + search toolbar over a sortable, selectable device table. Shows the miner columns by default; pass `columns` to change them."
      />
      <DemoBlock title="Default miner columns">
        <DeviceExplorer {...sharedProps} />
      </DemoBlock>
      <DemoBlock title="Extended columns — getMinerColumns() plus an action column">
        <DeviceExplorer {...sharedProps} columns={columnsWithAction} />
      </DemoBlock>
      <ToasterSlot />
    </div>
  )
}
