# HashrateMinerTypeView

Miner-type drilldown tab inside `<Hashrate>`. Bar chart of the latest
hashrate per miner type (Antminer, WhatsMiner, ...), with an optional
multi-select filter and a date-range picker that drives the host query.

## Props

| Prop                | Status   | Type                 | Default | Description                                          |
| ------------------- | -------- | -------------------- | ------- | ---------------------------------------------------- |
| `log`               | Optional | `HashrateGroupedLog` | `[]`    | Hashrate log grouped by miner type (`groupBy=miner`) |
| `isLoading`         | Optional | `boolean`            | `false` | Drives the chart spinner                             |
| `dateRange`         | Optional | `HashrateDateRange`  | —       | Selected date range                                  |
| `onDateRangeChange` | Optional | `(range) => void`    | —       | Fires when the user picks a new range                |
| `onReset`           | Optional | `VoidFunction`       | —       | Optional reset handler                               |

## Minimal example

```tsx
import { HashrateMinerTypeView } from "@tetherto/mdk-react-devkit";

<HashrateMinerTypeView isLoading={false} log={[]} />
```
