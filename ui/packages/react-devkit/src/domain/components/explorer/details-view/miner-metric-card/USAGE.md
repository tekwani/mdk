# MinerMetricCard

Card showing primary and secondary statistics for a single miner: efficiency, hashrate, temperature, frequency, and power consumption.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `primaryStats` | Optional | `StatItem[]` | — | Primary statistics (efficiency, hashrate, temperature, frequency, consumption) |
| `secondaryStats` | Optional | `StatItem[]` | — | Secondary statistics displayed in a supporting grid |
| `showSecondaryStats` | Optional | `boolean` | `true` | Whether to show the secondary stats section |

**StatItem shape:** `{ name?: string; value?: number | string; unit?: string }`

## Minimal example

```tsx
import { MinerMetricCard } from "@tetherto/mdk-react-devkit";

<MinerMetricCard
  primaryStats={[
    { name: "Hashrate", value: 95.5, unit: "TH/s" },
    { name: "Efficiency", value: 28.3, unit: "J/TH" },
  ]}
  secondaryStats={[
    { name: "Temperature", value: 65, unit: "°C" },
  ]}
  showSecondaryStats={true}
/>
```
