# Alerts

Page-level alerts feature: composes the searchable **Current Alerts** table
with an optional **Historical Alerts Log** section. Handles severity-filter
state, the sound-confirmation modal, historical date-range state, and the
shared `filterTags` slice on the devices store.

Use this when you want a drop-in `/alerts` route. For just the current-alerts
table or just the historical log, drop down to `CurrentAlerts` /
`HistoricalAlerts` directly.

## Props

| Prop                        | Status   | Type                                     | Default      | Description                                                                           |
| --------------------------- | -------- | ---------------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `devices`                   | Optional | `Device[]`                               | —            | Raw devices payload — the current-alerts table derives rows from `device.last.alerts` |
| `isCurrentAlertsLoading`    | Optional | `boolean`                                | `false`      | Loading flag for the current-alerts table                                             |
| `historicalAlerts`          | Optional | `Alert[]`                                | —            | Pre-fetched historical log entries                                                    |
| `isHistoricalAlertsLoading` | Optional | `boolean`                                | `false`      | Loading flag for the historical log                                                   |
| `isHistoricalAlertsEnabled` | Optional | `boolean`                                | `false`      | Show the historical section. Gate behind a feature flag if needed.                    |
| `selectedAlertId`           | Optional | `string`                                 | —            | Focus a single alert (deep-link from `?alertId=`)                                     |
| `initialSeverity`           | Optional | `string`                                 | —            | Initial severity filter (e.g. from `?severity=`)                                      |
| `onAlertClick`              | Optional | `(id?: string, uuid?: string) => void`   | —            | Row-click handler. Receives the device id and alert uuid.                             |
| `dateRange`                 | Optional | `HistoricalAlertsRange`                  | last 14 days | Controlled date range for the historical log                                          |
| `onDateRangeChange`         | Optional | `(range: HistoricalAlertsRange) => void` | —            | Called when the operator picks a new historical range                                 |
| `isSoundEnabled`            | Optional | `boolean`                                | `false`      | Whether sound alerts are on in user prefs. Drives the confirmation modal.             |
| `isDemoMode`                | Optional | `boolean`                                | `false`      | Skip sound playback (demo / preview screens)                                          |
| `typeFiltersForSite`        | Optional | `CascaderOption[]`                       | —            | Site-specific overrides for the type filter dropdown                                  |
| `header`                    | Optional | `ReactNode`                              | —            | Header (breadcrumbs etc.) rendered above the table                                    |
| `className`                 | Optional | `string`                                 | —            | Extra class on the page wrapper                                                       |

## Minimal example

```tsx
<Alerts
  devices={devices}
  isCurrentAlertsLoading={isLoading}
  isHistoricalAlertsEnabled
  historicalAlerts={history}
  onAlertClick={(id, uuid) => router.push(`/alerts/${uuid}?device=${id}`)}
/>
```

## Requirements

- Render inside `<MdkProvider>`. The component reads `filterTags` from the
  devices store and the historical log uses `useTimezoneFormatter`.

## Data contracts

- `Device` — [`foundation/types/device`](../../../types/device.ts). Same shape consumed by `CurrentAlerts`.
- `Alert` — [`foundation/types/alerts`](../../../types/alerts.ts). Same shape consumed by `HistoricalAlerts`.
- `HistoricalAlertsRange` — `{ start: number; end: number }` (ms epoch).

## Notes

- Filter tags are written to the shared devices store via `useDevices().setFilterTags` —
  clicking a row appends the device id, mirroring the source app behavior
- When `isHistoricalAlertsEnabled` is `false`, only the current-alerts table renders
- For URL-driven deep links, pass `initialSeverity` (one render only) for the
  severity dropdown and `selectedAlertId` to highlight a row
