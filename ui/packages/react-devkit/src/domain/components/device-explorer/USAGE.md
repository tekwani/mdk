# DeviceExplorer

Device explorer: filter + search toolbar over a sortable, selectable device
table. Shows the miner columns by default; pass `columns` to change them.
Designed to be controlled by URL state in the host app.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `Device[]` | - | Rows |
| `filterOptions` | Required | `DeviceExplorerFilterOption[]` | - | Filter category definitions |
| `getFormattedDate` | Required | `(date: Date) => string` | - | Date formatter from the host's timezone setup; used by the default miner columns |
| `onFiltersChange` | Required | `(value: LocalFilters) => void` | - | Setter for filters |
| `onSearchTagsChange` | Required | `(tags: string[]) => void` | - | Setter for search tags |
| `searchOptions` | Required | `DeviceExplorerSearchOption[]` | - | Searchable column definitions |
| `searchTags` | Required | `string[]` | - | Active search-tag chips |
| `className` | Optional | `string` | - | Additional class names |
| `columns` | Optional | `ColumnDef<Device>[]` | - | Table columns. Defaults to the miner columns ({@link getMinerColumns}) |
| `filters` | Optional | `LocalFilters` | - | Controlled filter values |
| `onRowClick` | Optional | `((device: Device) => void)` | - | Called when a row is clicked (e.g. to open the device's detail page) |
| `onSelectedDevicesChange` | Optional | `((selections: RowSelectionState) => void)` | - | Setter for row selection |
| `onSortingChange` | Optional | `((sorting: SortingState) => void)` | - | - |
| `selectedDevices` | Optional | `RowSelectionState` | - | Controlled row-selection state |

### `DeviceExplorerFilterOption`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `label` | Required | `string` | - | Text shown in the filter cascader |
| `value` | Required | `string` | - | Category key at the top level (e.g. `status`), or a selectable value under it; selections reach `onFiltersChange` as `[category, value]` paths |
| `children` | Optional | `DeviceExplorerFilterOption[]` | - | Values selectable under this category; omit on leaf options |

### `DeviceExplorerSearchOption`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `label` | Required | `string` | - | Suggestion text, matched case-insensitively against the typed query and shown on the chip |
| `value` | Required | `string` | - | Tag added to `searchTags` when this suggestion is picked (free-text tags are also allowed) |
<!-- END GENERATED: props -->

## Minimal example

```tsx
<DeviceExplorer
  data={devices}
  filterOptions={filterOptions}
  searchOptions={searchOptions}
  searchTags={searchTags}
  onSearchTagsChange={setSearchTags}
  onFiltersChange={setFilters}
  getFormattedDate={(date) => formatInTimezone(date, tz)}
/>
```

## Custom columns

Spread the default miner columns and add your own, e.g. a per-row action:

```tsx
import { DeviceExplorer, getMinerColumns } from "@tetherto/mdk-react-devkit"

const columns = [
  ...getMinerColumns({ getFormattedDate }),
  { id: "action", header: "Actions", cell: ({ row }) => <RowActionMenu device={row.original} /> },
]

<DeviceExplorer {...props} columns={columns} />
```

An app with several device kinds renders one explorer per kind (e.g. under the
primitive `Tabs`), each with its own `columns` and `data`.

## Data contracts

- `Device` — [`foundation/types/device`](../../types/device.ts)
- `LocalFilters`, `DataTableRowSelectionState` — re-exported from `core`.

## Notes

- Props only: no provider is required. `getFormattedDate` comes from the host,
  e.g. `useTimezoneFormatter().getFormattedDate` from `@tetherto/mdk-react-adapter`
