import type { Device } from '../../types/device'

export type DeviceExplorerFilterOption = {
  /** Category key at the top level (e.g. `status`), or a selectable value under it; selections reach `onFiltersChange` as `[category, value]` paths */
  value: string
  /** Text shown in the filter cascader */
  label: string
  /** Values selectable under this category; omit on leaf options */
  children?: DeviceExplorerFilterOption[]
}

export type DeviceExplorerSearchOption = {
  /** Tag added to `searchTags` when this suggestion is picked (free-text tags are also allowed) */
  value: string
  /** Suggestion text, matched case-insensitively against the typed query and shown on the chip */
  label: string
}

export type DeviceExplorerDeviceData = Device

export { type AlertRecord } from '../../types/alerts'

