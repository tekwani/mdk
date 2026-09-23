/**
 * Canonical reference page for the mdk-ui-shell template. Not routed in a bare
 * shell — copy this file into `src/pages/`, then add its entry to
 * `src/routes.ts` and its icon to `src/constants/navigation.tsx`.
 */
import {
  DEVICE_EXPLORER_DEVICE_TYPE,
  DeviceExplorer,
  EmptyState,
  ExplorerDetail,
  ExplorerLayout,
  useExplorerData,
  useExplorerSelection,
} from '@tetherto/mdk-react-devkit'
import type {
  DataTableRowSelectionState,
  DeviceExplorerDeviceData,
  DeviceExplorerDeviceType,
  LocalFilters,
} from '@tetherto/mdk-react-devkit'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { PageLayout } from '../components/PageLayout'
import { buildContainerDetailPath, ROUTE_PATHS } from '../constants/routes'

const ExplorerPage = () => {
  const navigate = useNavigate()
  const [deviceType, setDeviceType] = useState<DeviceExplorerDeviceType>(
    DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER,
  )
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [filters, setFilters] = useState<LocalFilters>({})
  const [selected, setSelected] = useState<DataTableRowSelectionState>({})

  // Search / status-filter / sort are client-side over a tag-filtered fetch —
  // this mirrors the reference app (BE-side paging is tracked separately with management).
  const { data, searchOptions, filterOptions } = useExplorerData({
    deviceType,
    searchTags,
    filters,
  })

  // Bridge the table selection into `devicesStore` so the write-control cards
  // (Batch Container Controls, etc.) read it. Resets on tab/selection change.
  useExplorerSelection({
    deviceType,
    rows: data,
    selected,
  })

  const hasSelection = Object.values(selected).some(Boolean)

  // A container row opens its full detail page (with a backUrl so the page's
  // Back link returns here). The table ignores clicks on the selection
  // checkbox, so multi-select for batch actions still works. Miner/cabinet
  // rows keep the sticky detail panel instead — no row-click navigation.
  const handleContainerRowClick = (device: DeviceExplorerDeviceData): void => {
    navigate(buildContainerDetailPath(device.id, 'home', ROUTE_PATHS.EXPLORER))
  }

  // Selections are per-tab (ids differ across container/miner/cabinet); clear
  // them when the tab changes so a stale id can't drive the detail panel.
  const handleDeviceTypeChange = (type: DeviceExplorerDeviceType): void => {
    setDeviceType(type)
    setSelected({})
  }

  const renderDetail = () => {
    if (!hasSelection) {
      return <EmptyState description="Select a row to see its details" />
    }

    // The per-type panel (container / miner / cabinet) is composed by ExplorerDetail.
    return <ExplorerDetail deviceType={deviceType} onNavigate={(path) => void navigate(path)} />
  }

  return (
    <PageLayout title="Explorer" className="mdk-ui-shell-explorer">
      <ExplorerLayout hasSelection={hasSelection} detail={renderDetail()}
        list={
          <DeviceExplorer
            data={data}
            deviceType={deviceType}
            onDeviceTypeChange={handleDeviceTypeChange}
            searchOptions={searchOptions}
            searchTags={searchTags}
            onSearchTagsChange={setSearchTags}
            filterOptions={filterOptions}
            onFiltersChange={setFilters}
            selectedDevices={selected}
            onSelectedDevicesChange={setSelected}
            getFormattedDate={(date: Date) => date.toISOString()}
            renderAction={() => null}
            onRowClick={
              deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER
                ? handleContainerRowClick
                : undefined
            }
          />
        }
      />
    </PageLayout>
  )
}

export default ExplorerPage
