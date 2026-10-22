# `MinerMetricCard`

Card showing primary and secondary statistics for a single miner: efficiency, hashrate, temperature, frequency, and power consumption.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `primaryStats` | Optional | `StatItem[]` | - | Primary statistics (efficiency, hashrate, temperature, frequency, consumption) |
| `secondaryStats` | Optional | `StatItem[]` | - | Secondary statistics to display in grid |
| `showSecondaryStats` | Optional | `boolean` | `true` | Whether to show secondary stats section |

### `StatItem`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `name` | Optional | `string` | - | In `primaryStats`, selects the slot and must be exactly 'Efficiency', 'Hash rate', 'Temperature', 'Frequency' or 'Consumption'; in `secondaryStats`, the label (and React key) |
| `unit` | Optional | `string` | - | Unit appended after the value in `primaryStats`; ignored in `secondaryStats`, so fold it into `value` there |
| `value` | Optional | `string \| number` | - | Displayed value; Efficiency only shows when it is a number |
<!-- END GENERATED: props -->

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
