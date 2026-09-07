# AlertsTable family — `CurrentAlerts` and `HistoricalAlerts`

The MDK doesn't ship a single "AlertsTable" component. The agent-first design
document uses the name as a category — there are two concrete components:

- `CurrentAlerts` — sortable, searchable data table of currently active alerts
  derived from a raw `Device[]` payload. Plays an audible beep when a
  critical alert is present (gated by user confirmation).
- `HistoricalAlerts` — sortable data table of historical alerts within a
  controlled date range, with an embedded `DateRangePicker`

Both render a `DataTable` with shared columns from [`alerts-table-columns.tsx`](./alerts-table-columns.tsx).

## `CurrentAlerts` props

| Prop                   | Status   | Type                                      | Default | Description                                                    |
| ---------------------- | -------- | ----------------------------------------- | ------- | -------------------------------------------------------------- |
| `localFilters`         | Required | `AlertLocalFilters`                       | —       | Filters controlled outside (e.g. URL severity)                 |
| `onLocalFiltersChange` | Required | `(filters: AlertLocalFilters) => void`    | —       | Setter for the filters above                                   |
| `filterTags`           | Required | `string[]`                                | —       | Search tag chips (controlled)                                  |
| `onFilterTagsChange`   | Required | `(tags: string[]) => void`                | —       | Setter for the tags above                                      |
| `devices`              | Optional | `Device[]`                                | —       | Raw devices payload (alerts derived from `device.last.alerts`) |
| `isLoading`            | Optional | `boolean`                                 | `false` | Show DataTable loading overlay                                 |
| `selectedAlertId`      | Optional | `string`                                  | —       | Optional deep-link id                                          |
| `onAlertClick`         | Optional | `(id?: string, uuid?: string) => void`    | —       | Called when the user opens an alert                            |
| `isSoundEnabled`       | Optional | `boolean`                                 | `false` | Enable critical alert beep                                     |
| `isDemoMode`           | Optional | `boolean`                                 | `false` | Skip sound entirely (demos / previews)                         |
| `typeFiltersForSite`   | Optional | `TagFilterBarProps["typeFiltersForSite"]` | —       | Site-specific overrides for the type filter                    |
| `className`            | Optional | `string`                                  | —       | Additional class names                                         |

## `HistoricalAlerts` props

| Prop                | Status   | Type                                              | Default | Description                          |
| ------------------- | -------- | ------------------------------------------------- | ------- | ------------------------------------ |
| `localFilters`      | Required | `AlertLocalFilters`                               | —       | Shared with `CurrentAlerts`          |
| `filterTags`        | Required | `string[]`                                        | —       | Shared with `CurrentAlerts`          |
| `dateRange`         | Required | `{ start: number; end: number }`                  | —       | Controlled date range                |
| `onDateRangeChange` | Required | `(range: { start: number; end: number }) => void` | —       | Setter for the date range            |
| `alerts`            | Optional | `Alert[]`                                         | `[]`    | Pre-fetched historical alert entries |
| `isLoading`         | Optional | `boolean`                                         | `false` | Show DataTable loading overlay       |
| `onAlertClick`      | Optional | `(id?: string, uuid?: string) => void`            | —       | Called when the user opens an alert  |
| `className`         | Optional | `string`                                          | —       | Additional class names               |

## Minimal example

```tsx
<HistoricalAlerts
  alerts={alerts}
  localFilters={localFilters}
  filterTags={filterTags}
  dateRange={range}
  onDateRangeChange={setRange}
/>
```

## Data contracts

- `Alert` — `@tetherto/mdk-react-devkit` / [`foundation/types/alerts`](../../types/alerts.ts)
- `AlertLocalFilters` — same package, [`domain/alerts/alerts-types`](./alerts-types.ts)
- `Device` — [`foundation/types/device`](../../types/device.ts)

## Notes

- Both components call `useTimezoneFormatter` from
  `@tetherto/mdk-react-adapter`; wrap your app in `<MdkProvider>` so the
  timezone store is reachable
- The columns are shared, so `getRowId` returns the alert's `uuid` in both
