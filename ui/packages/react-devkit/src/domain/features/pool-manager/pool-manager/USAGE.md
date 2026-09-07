# PoolManager

Composite Pool Manager surface. Owns internal, state-based view switching across
the dashboard and the four feature views (Pools, Miner Explorer, Sites Overview,
Site Detail), so the whole experience resolves to a single route. The global
`ActionsSidebar` (mounted in [`App.tsx`](../../../../../../../../examples/mdk-ui-shell-template/src/App.tsx)) handles writes staged from any sub-view
(create/edit pool, assign miners) so they can be submitted to the voting workflow.

All data is supplied via props — the shell page is thin glue that reads the
adapter hooks (`usePoolConfigsData`, `useMinerDevices`, `useSitesOverview`,
`usePoolManagerDashboard`) and passes them down.

```tsx
import { PoolManager } from '@tetherto/mdk-react-devkit'
import {
  useMinerDevices,
  usePoolConfigsData,
  usePoolManagerDashboard,
  useSitesOverview,
} from '@tetherto/mdk-react-adapter'

const PoolManagerPage = () => {
  const { data: poolConfig } = usePoolConfigsData()
  const { data: miners } = useMinerDevices()
  const sites = useSitesOverview()
  const dashboard = usePoolManagerDashboard()

  return (
    <PoolManager
      poolConfig={poolConfig}
      miners={miners}
      units={sites.units}
      isSitesLoading={sites.isLoading}
      sitesError={sites.error}
      stats={dashboard.stats}
      isStatsLoading={dashboard.isLoading}
      alerts={dashboard.alerts}
    />
  )
}
```

Must be rendered inside `<MdkProvider>`.

## Props

| Prop                    | Status   | Type                        | Default       | Description                                     |
| ----------------------- | -------- | --------------------------- | ------------- | ----------------------------------------------- |
| `poolConfig`            | Required | `PoolConfigData[]`          | —             | Shared by every sub-view (Pools, Miner Explorer, Sites) |
| `stats`                 | Optional | `DashboardStats`            | —             | Dashboard stat blocks                            |
| `isStatsLoading`        | Optional | `boolean`                   | —             | Dashboard stats loading flag                     |
| `alerts`                | Optional | `Alert[]`                   | —             | Recent alerts for the dashboard list             |
| `onViewAllAlerts`       | Optional | `VoidFunction`              | —             | Dashboard "View All Alerts" handler (e.g. navigate to `/alerts`) |
| `miners`                | Optional | `ListThingsDevice[]`        | `[]`          | Miners for the Miner Explorer view               |
| `units`                 | Optional | `ProcessedContainerUnit[]`  | `[]`         | Normalized site units for the Sites Overview view |
| `isSitesLoading`        | Optional | `boolean`                   | —             | Sites Overview loading flag                      |
| `sitesError`            | Optional | `unknown`                   | —             | Sites Overview error                             |
| `siteDevices`           | Optional | `ContainerUnit[]`           | `[]`          | Raw container devices used to resolve the selected unit for Site Detail |
| `siteDetailDataOptions` | Optional | `SiteOverviewDetailsDataOptions`  | —  | Extra data-fetch knobs forwarded to the Site Detail container |
| `isSiteDetailLoading`   | Optional | `boolean`                   | —             | Site Detail loading flag                         |
| `initialView`           | Optional | `PoolManagerView`           | `'dashboard'` | Starting view (uncontrolled)                     |
| `view`                  | Optional | `PoolManagerView`           | —             | Controlled view — syncs internal state whenever it changes |
| `onViewChange`          | Optional | `(view: PoolManagerView) => void` | —  | Notified whenever the active view changes (lets the page lazy-fetch) |
| `onSiteSelect`          | Optional | `(unitId: string) => void`  | —        | Notified with the selected unit id when a site card is opened |
| `className`             | Optional | `string`                    | —             | Additional class names                           |

## Loading & error states

`isStatsLoading`, `isSitesLoading`, and `isSiteDetailLoading` render the
respective sub-views in a loading state; `sitesError` surfaces a fetch failure on
the Sites Overview grid. Forward the adapter hooks' `isLoading` / `error` fields
straight through.

## Controlled vs. uncontrolled view

- **Uncontrolled** — pass only `initialView` (or nothing) and let `<PoolManager>`
  own navigation internally via its dashboard blocks and back buttons
- **Controlled** — pass `view` (typically derived from a `?view=` URL query
  param) and handle `onViewChange` to write it back. The component syncs its
  internal state to `view` whenever it changes.

## Wiring Site Detail

Site Detail is a transient view opened by clicking a Sites Overview card. Capture
the selected unit id via `onSiteSelect`, then pass `siteDetailDataOptions`
(e.g. the miners assigned to that container) and `isSiteDetailLoading` so the
view shows live data. See [`examples/mdk-ui-shell-template/_managed/pages/PoolManager.tsx`](../../../../../../../../examples/mdk-ui-shell-template/_managed/pages/PoolManager.tsx) for
a complete example.
