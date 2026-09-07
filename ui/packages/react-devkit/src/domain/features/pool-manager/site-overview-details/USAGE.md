# PoolManagerSiteOverviewDetails

Pool-manager site detail page: drilldown for a single site showing configured
pools, recent miner activity, and performance charts. Renders the breadcrumb
header (`Site Overview / <unitName>`) and delegates the body to
`SiteOverviewDetailsContainer`.

Use this as the `/pool-manager/sites/:id` route.

## Props

| Prop              | Status   | Type                             | Default | Description                                              |
| ----------------- | -------- | -------------------------------- | ------- | -------------------------------------------------------- |
| `unit`            | Required | `UnitData`                       | —       | The site (container unit) to render details for          |
| `unitName`        | Required | `string`                         | —       | Display name shown in the breadcrumb                     |
| `poolConfig`      | Required | `PoolConfigData[]`               | —       | Pool configurations powering the per-pool detail rows    |
| `backButtonClick` | Required | `VoidFunction`                   | —       | Called when the operator clicks the "Site Overview" link |
| `dataOptions`     | Optional | `SiteOverviewDetailsDataOptions` | —       | Knobs forwarded to `useSiteOverviewDetailsData`          |
| `isLoading`       | Optional | `boolean`                        | `false` | Show a centered loader instead of the detail container   |

## Minimal example

```tsx
<PoolManagerSiteOverviewDetails
  unit={site}
  unitName={site.name}
  poolConfig={poolConfig}
  isLoading={isLoading}
  backButtonClick={() => router.push("/pool-manager/sites")}
/>
```

## Data contracts

- `UnitData` — [`foundation/components/pool-manager/site-overview-details/use-site-overview-details-data`](../../../components/pool-manager/site-overview-details/use-site-overview-details-data.ts)
- `PoolConfigData` — exported from `@tetherto/mdk-react-devkit`
- `SiteOverviewDetailsDataOptions` — exported from
  [`foundation/components/pool-manager/site-overview-details/use-site-overview-details-data`](../../../components/pool-manager/site-overview-details/use-site-overview-details-data.ts)

## Notes

- The page expects the parent route to fetch the site and pool data and pass
  it through props. Use the companion `useSiteOverviewDetailsData` hook (or
  your own TanStack Query) and forward the loading flag here
- The breadcrumb second segment renders `unitName` after a `/` separator —
  pass a human-friendly name (e.g. site display name, not the raw id)
