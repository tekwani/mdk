# DeviceExplorer

Top-level device explorer: filter toolbar + searchable, sortable table of
miners, containers, or cabinets. Designed to be controlled by URL state in the host app.

## Props

| Prop                      | Status   | Type                                                    | Default | Description                                   |
| ------------------------- | -------- | ------------------------------------------------------- | ------- | --------------------------------------------- |
| `deviceType`              | Required | `DeviceExplorerDeviceType`                              | —       | Active device-type tab                        |
| `onDeviceTypeChange`      | Required | `(deviceType: DeviceExplorerDeviceType) => void`        | —       | Setter for the device type                    |
| `data`                    | Required | `Device[]`                                              | —       | Rows                                          |
| `onFiltersChange`         | Required | `(filters: LocalFilters) => void`                       | —       | Setter for filters                            |
| `filterOptions`           | Required | `DeviceExplorerToolbarProps["filterOptions"]`           | —       | Filter category definitions                   |
| `searchOptions`           | Required | `DeviceExplorerToolbarProps["searchOptions"]`           | —       | Searchable column definitions                 |
| `searchTags`              | Required | `string[]`                                              | —       | Active search-tag chips                       |
| `onSearchTagsChange`      | Required | `(tags: string[]) => void`                              | —       | Setter for search tags                        |
| `getFormattedDate`        | Required | `(date: Date) => string`                                | —       | Date formatter from the host's timezone setup |
| `renderAction`            | Required | `(device: DeviceExplorerDeviceData) => React.ReactNode` | —       | Renderer for the per-row action cell          |
| `filters`                 | Optional | `LocalFilters`                                          | —       | Controlled filter values                      |
| `selectedDevices`         | Optional | `DataTableRowSelectionState`                            | —       | Controlled row-selection state                |
| `onSelectedDevicesChange` | Optional | `(selections: DataTableRowSelectionState) => void`      | —       | Setter for row selection                      |
| `onRowClick`              | Optional | `(device: DeviceExplorerDeviceData) => void`            | —       | Makes rows interactive (click/Enter/Space); see the `DataTable` USAGE.md for the click-target exclusions this inherits |
| `className`               | Optional | `string`                                                | —       | Additional class names                        |

## Minimal example

```tsx
<DeviceExplorer
  deviceType={deviceType}
  onDeviceTypeChange={setDeviceType}
  data={devices}
  filterOptions={filterOptions}
  searchOptions={searchOptions}
  searchTags={searchTags}
  onSearchTagsChange={setSearchTags}
  onFiltersChange={setFilters}
  getFormattedDate={(date) => formatInTimezone(date, tz)}
  renderAction={(device) => <RowActionMenu device={device} />}
/>
```

## Data contracts

- `DeviceExplorerDeviceType = "container" | "miner" | "cabinet"`
- `Device` — [`foundation/types/device`](../../types/device.ts)
- `LocalFilters`, `DataTableRowSelectionState` — re-exported from `core`.

## Notes

- The component handles the device-type/sorting interaction internally:
  switching to `cabinet` selects a default sort by `id` desc, switching to
  any other type clears sort
- Wrap the page in `<MdkProvider>`; the toolbar calls `useDeviceResolution`
  and the table consumes `useTimezoneFormatter`
