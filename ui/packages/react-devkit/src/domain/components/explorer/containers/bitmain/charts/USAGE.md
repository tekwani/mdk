# Bitmain Container Charts

Five time-series chart panels for BitMain hydro and immersion containers:

| Component | Description |
|---|---|
| `BitMainHydroLiquidTemperatureCharts` | Dielectric liquid temperature for a hydro-cooled container |
| `BitMainLiquidPressureCharts` | Dielectric liquid pressure across an immersion container |
| `BitMainLiquidTempCharts` | Dielectric liquid temperature across an immersion container |
| `BitMainPowerCharts` | Per-phase power, voltage, and current draw |
| `BitMainSupplyLiquidFlowCharts` | Supply-side coolant flow rates |

All extend `ContainerChartsBuilderProps`.

## Props (all components)

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `tag` | Optional | `string` | — | Container identifier used as the API telemetry key |
| `data` | Optional | `Array<UnknownRecord>` | — | Raw telemetry payload from the container API |
| `timeline` | Optional | `string` | `'24h'` | Active time-range selection (e.g. `"24h"`) |
| `dateRange` | Optional | `{ start?: number; end?: number }` | — | Custom date range as Unix epoch seconds |
| `fixedTimezone` | Optional | `string` | — | IANA timezone string |
| `height` | Optional | `number` | — | Chart height in pixels |
| `chartTitle` | Optional | `string` | Per component | Panel heading override |
| `showLegend` | Optional | `boolean` | `true` | Show the toggleable series legend. Defaults to `false` for `BitMainSupplyLiquidFlowCharts`. |
| `showRangeSelector` | Optional | `boolean` | `true` | Show the range selector controls |
| `footer` | Optional | `React.ReactNode` | — | Optional footer content rendered below the chart |

Each component defaults `chartTitle` to its own heading: `'Hydro Liquid Temperature'` (`BitMainHydroLiquidTemperatureCharts`), `'Liquid Pressure'` (`BitMainLiquidPressureCharts`), `'Liquid Temperature'` (`BitMainLiquidTempCharts`), `'Power Consumption'` (`BitMainPowerCharts`), `'Supply Liquid Flow'` (`BitMainSupplyLiquidFlowCharts`).

## Minimal example

```tsx
import { BitMainPowerCharts } from "@tetherto/mdk-react-devkit";

<BitMainPowerCharts tag="container-01" data={telemetry} timeline="24h" />
```
