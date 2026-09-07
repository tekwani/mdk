# HashrateMiningUnitView

Mining-unit drilldown tab inside `<Hashrate>`. Bar chart of the latest
hashrate per container (Bitdeer 1A, MicroBT 1, ...), with an optional
multi-select filter. The utils layer drops BE-leaked rollup keys
(`group-N`, `maintenance`) so the consumer never sees them.

## Props

| Prop                | Status   | Type                 | Default | Description                                             |
| ------------------- | -------- | -------------------- | ------- | ------------------------------------------------------- |
| `log`               | Optional | `HashrateGroupedLog` | `[]`    | Hashrate log grouped by container (`groupBy=container`) |
| `isLoading`         | Optional | `boolean`            | `false` | Drives the chart spinner                                |
| `dateRange`         | Optional | `HashrateDateRange`  | —       | Selected date range                                     |
| `onDateRangeChange` | Optional | `(range) => void`    | —       | Fires when the user picks a new range                   |
| `onReset`           | Optional | `VoidFunction`       | —       | Optional reset handler                                  |

## Minimal example

```tsx
import { HashrateMiningUnitView } from "@tetherto/mdk-react-devkit";

<HashrateMiningUnitView isLoading={false} log={[]} />
```
