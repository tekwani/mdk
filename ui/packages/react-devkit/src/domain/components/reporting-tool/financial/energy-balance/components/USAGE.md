# Energy Balance Metric Components

Individual stat cards and charts used inside the Energy Balance section.

| Component | Description |
|---|---|
| `EnergyMetricCard` | Single stat card for one energy balance metric. |
| `EnergyCostChart` | Bar chart comparing site revenue vs cost per MWh with USD/BTC toggle. |
| `EnergyRevenueChart` | Bar chart of site energy revenue per MWh with USD/BTC toggle. |
| `EnergyBalancePowerChart` | Line chart of power consumption against threshold. |

Downtime in the revenue mosaic uses core `AverageDowntimeChart` (see its own `USAGE.md`).

The cost and revenue tabs each render a row of `EnergyMetricCard`s driven by data, not by separate per-metric components (e.g. `name: 'Avg All-In Cost'`, `name: 'Curtailment Rate'`).

## EnergyMetricCard props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | Required | `string` | — | Metric label shown on the card |
| `value` | Required | `number` | — | Metric value, formatted via `formatNumber` |
| `unit` | Required | `string` | — | Unit suffix shown next to the value |
| `fallback` | Optional | `string` | — | Text shown when `value` can't be formatted |

## EnergyBalancePowerChart props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `chartInput` | Required | `ThresholdLineChartInput` | — | Series and optional threshold line for power vs availability |
| `periodType` | Required | `PeriodType` | — | Controls x-axis date formatting (`month` uses `MM-yy`) |
| `height` | Optional | `number` | `280` | Chart height when `fillHeight` is false |
| `fillHeight` | Optional | `boolean` | `false` | Stretch the panel and chart to fill a mosaic cell (uses height `320` and `mdk-energy-balance__panel--fill`). Used on the revenue tab power column in `EnergyBalanceRevenueCharts`. |

## Minimal example

```tsx
import { EnergyMetricCard } from "@tetherto/mdk-react-devkit";

<EnergyMetricCard name="Avg All-In Cost" value={42.5} unit="$/MWh" />
<EnergyMetricCard name="Curtailment Rate" value={3.2} unit="%" fallback="0" />
```

## Notes

- The revenue tab left column wraps `AverageDowntimeChart` in `mdk-energy-balance__panel--fill` inside `EnergyBalanceRevenueCharts`. Parent layout should use `mdk-energy-balance__revenue-mosaic` (or equivalent flex column with `min-height: 0`) so `--fill` panels can grow.
- Set `fillHeight` on `EnergyBalancePowerChart` in the same mosaic when it should stretch with the layout
- Other charts in this folder (`EnergyCostChart`, `EnergyRevenueChart`) do not expose `fillHeight`; they use a fixed default height.
