import { ListViewFilter, TagInput } from '@primitives'
import type { CascaderValue, LocalFilters } from '@primitives'
import type { DeviceExplorerFilterOption, DeviceExplorerSearchOption } from './types'

import type { JSX } from 'react'

export type DeviceExplorerToolbarProps = {
  /** Controlled filter values */
  filters: LocalFilters
  /** Filter category definitions */
  filterOptions: DeviceExplorerFilterOption[]
  onFiltersChange: (value: CascaderValue[]) => void
  /** Searchable column definitions */
  searchOptions: DeviceExplorerSearchOption[]
  /** Active search-tag chips */
  searchTags: string[]
  /** Setter for search tags */
  onSearchTagsChange: (tags: string[]) => void
}

export const DeviceExplorerToolbar = ({
  filters,
  filterOptions,
  onFiltersChange,
  searchOptions,
  searchTags,
  onSearchTagsChange,
}: DeviceExplorerToolbarProps): JSX.Element => {
  const showFilter = filterOptions.length > 0

  return (
    <div className="mdk-device-explorer__toolbar">
      {showFilter && (
        <ListViewFilter
          localFilters={filters}
          options={filterOptions}
          onChange={onFiltersChange}
          className="mdk-device-explorer__toolbar__filter"
        />
      )}
      <TagInput
        allowCustomTags
        placeholder="Search"
        options={searchOptions}
        onTagsChange={onSearchTagsChange}
        value={searchTags}
        variant="search"
        className="mdk-device-explorer__toolbar__search"
      />
    </div>
  )
}
