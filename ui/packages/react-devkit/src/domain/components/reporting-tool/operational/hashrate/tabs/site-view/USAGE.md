# HashrateSiteView

Site-level hashrate trend tab inside `<Hashrate>`. Aggregates the grouped
hashrate log across all (or filtered) miner types into a single series for
the selected date range.

## Props

| Prop                | Status   | Type                 | Default | Description                           |
| ------------------- | -------- | -------------------- | ------- | ------------------------------------- |
| `log`               | Optional | `HashrateGroupedLog` | `[]`    | Hashrate log grouped by miner type    |
| `isLoading`         | Optional | `boolean`            | `false` | Drives the chart spinner              |
| `dateRange`         | Optional | `HashrateDateRange`  | —       | Selected date range                   |
| `onDateRangeChange` | Optional | `(range) => void`    | —       | Fires when the user picks a new range |
| `onReset`           | Optional | `VoidFunction`       | —       | Optional reset handler                |

The miner-type filter state is owned internally - the chart re-sums whenever
the user toggles a miner type.

## Minimal example

```tsx
import { HashrateSiteView } from "@tetherto/mdk-react-devkit";

<HashrateSiteView isLoading={false} log={[]} />
```
