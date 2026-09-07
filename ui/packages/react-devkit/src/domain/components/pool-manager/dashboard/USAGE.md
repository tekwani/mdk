# PoolManagerDashboard

Landing page for the Pool Manager: site-level stats, primary navigation
blocks, and a compact recent-alerts list.

## Props

| Prop                | Status   | Type                    | Default | Description                                           |
| ------------------- | -------- | ----------------------- | ------- | ----------------------------------------------------- |
| `onNavigationClick` | Required | `(url: string) => void` | —       | Called when a navigation block is clicked             |
| `onViewAllAlerts`   | Required | `VoidFunction`          | —       | Called when "View All Alerts" is clicked              |
| `stats`             | Optional | `DashboardStats`        | —       | Top-of-page stat blocks; hidden while loading         |
| `isStatsLoading`    | Optional | `boolean`               | `false` | Hide stats while loading                              |
| `alerts`            | Optional | `Alert[]`               | `[]`    | Recent alerts list (capped to `MAX_ALERTS_DISPLAYED`) |

## Minimal example

```tsx
<PoolManagerDashboard
  stats={stats}
  alerts={alerts}
  onNavigationClick={(url) => router.push(url)}
  onViewAllAlerts={() => router.push("/alerts")}
/>
```

## Data contracts

- `DashboardStats` — declared in [`dashboard-types.ts`](./dashboard-types.ts) alongside the component
- `Alert` — [`foundation/types/alerts`](../../../types/alerts.ts) (same shape as `ActiveIncidentsCard` consumes)

## Notes

- Navigation blocks are static (`navigationBlocks` constant) — extend the
  constant to add or rename sections
- For a more compact recent-alerts list elsewhere on the page, prefer
  `ActiveIncidentsCard`
