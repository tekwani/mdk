# StatsGroupCard

Aggregated stats card for a group of miners: total hashrate, max temperature, average frequency, and total power consumption.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `miners` | Optional | `DeviceData[] \| Device[]` | — | Array of miners whose stats should be aggregated |
| `isMinerMetrics` | Optional | `boolean` | `false` | Show miner-metrics layout instead of container layout |

## Minimal example

```tsx
import { StatsGroupCard } from "@tetherto/mdk-react-devkit";

<StatsGroupCard miners={devices} />
```
