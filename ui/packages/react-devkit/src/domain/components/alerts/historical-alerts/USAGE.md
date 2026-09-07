# HistoricalAlerts

Sortable data table of historical alerts within a controlled date range, with
an embedded `DateRangePicker`.

> Sibling component: [`CurrentAlerts`](../current-alerts/USAGE.md). Both
> render the same `DataTable` columns from [`alerts-table-columns.tsx`](../alerts-table-columns.tsx).

## Props

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

- `Alert` — `@tetherto/mdk-react-devkit` / [`foundation/types/alerts`](../../../types/alerts.ts)
- `AlertLocalFilters` — same package, [`foundation/components/alerts/alerts-types`](../alerts-types.ts)

## Notes

- Calls `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap your
  app in `<MdkProvider>` so the timezone store is reachable
- `getRowId` returns the alert `uuid`
