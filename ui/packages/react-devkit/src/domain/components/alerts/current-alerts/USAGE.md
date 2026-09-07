# CurrentAlerts

Sortable, searchable data table of currently active alerts derived from a raw
`Device[]` payload. Plays an audible beep when a critical alert is present
(gated by user confirmation).

> Sibling component: [`HistoricalAlerts`](../historical-alerts/USAGE.md).
> Both render the same `DataTable` columns from [`alerts-table-columns.tsx`](../alerts-table-columns.tsx).

## Props

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

## Minimal example

```tsx
<CurrentAlerts
  devices={devices}
  localFilters={localFilters}
  onLocalFiltersChange={setLocalFilters}
  filterTags={tags}
  onFilterTagsChange={setTags}
  onAlertClick={(id) => openDetail(id)}
/>
```

## Data contracts

- `Alert` — `@tetherto/mdk-react-devkit` / [`foundation/types/alerts`](../../../types/alerts.ts)
- `AlertLocalFilters` — same package, [`foundation/components/alerts/alerts-types`](../alerts-types.ts)
- `Device` — [`foundation/types/device`](../../../types/device.ts)

## Notes

- Calls `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap your
  app in `<MdkProvider>` so the timezone store is reachable
- `getRowId` returns the alert `uuid`
