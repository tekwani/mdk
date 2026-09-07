# Hashrate

Operational hashrate reporting view with three tabs:

- **Site View** - aggregated site hashrate trend over the selected date
  range, with an optional miner-type filter.
- **Miner Type View** - latest hashrate per miner model.
- **Mining Unit View** - latest hashrate per container.

Each tab fetches independently (different `groupBy` axes and date ranges);
the composite is a thin tabs shell that stitches them together via per-tab
prop bags.

## Props

| Prop             | Status   | Type                          | Default       | Description                                 |
| ---------------- | -------- | ----------------------------- | ------------- | ------------------------------------------- |
| `defaultTab`     | Optional | `HashrateTabValue`            | `"site-view"` | Tab selected on first render                |
| `siteView`       | Optional | `HashrateSiteViewProps`       | —             | Props forwarded to the Site View tab        |
| `minerTypeView`  | Optional | `HashrateMinerTypeViewProps`  | —             | Props forwarded to the Miner Type View tab  |
| `miningUnitView` | Optional | `HashrateMiningUnitViewProps` | —             | Props forwarded to the Mining Unit View tab |

Each `*ViewProps` bag exposes `log`, `isLoading`, `dateRange`, `onDateRangeChange`, and `onReset`. The filter state
(which miner types / mining units are selected) is owned internally by each tab.

## Minimal example

```tsx
import { Hashrate } from "@tetherto/mdk-react-devkit";

<Hashrate />
```

## Wired example

```tsx
import { Hashrate } from "@tetherto/mdk-react-devkit";

const minerQuery = useGetHashrateGroupedQuery({ groupBy: "miner", ...minerRange });
const containerQuery = useGetHashrateGroupedQuery({ groupBy: "container", ...containerRange });

<Hashrate
  siteView={{
    log: minerQuery.data?.log,
    isLoading: minerQuery.isLoading,
    dateRange: minerRange,
    onDateRangeChange: setMinerRange,
  }}
  minerTypeView={{
    log: minerQuery.data?.log,
    isLoading: minerQuery.isLoading,
    dateRange: minerRange,
    onDateRangeChange: setMinerRange,
  }}
  miningUnitView={{
    log: containerQuery.data?.log,
    isLoading: containerQuery.isLoading,
    dateRange: containerRange,
    onDateRangeChange: setContainerRange,
  }}
/>
```
