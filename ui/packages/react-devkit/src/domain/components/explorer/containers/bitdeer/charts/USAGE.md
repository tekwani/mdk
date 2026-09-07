# BitdeerTankPressureCharts / BitdeerTankTempCharts

Time-series chart panels for Bitdeer immersion containers. `BitdeerTankPressureCharts` plots Tank1/Tank2 dielectric pressure (bar). `BitdeerTankTempCharts` plots oil and water hot/cold temperatures for a selected tank.

## Props (both components extend `ContainerChartsBuilderProps`)

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `tag` | Optional | `string` | — | Container identifier used as the API telemetry key |
| `data` | Optional | `Array<UnknownRecord>` | — | Raw telemetry payload from the container API |
| `timeline` | Optional | `string` | — | Active time-range selection (e.g. `"24h"`, `"7d"`) |
| `dateRange` | Optional | `{ start?: number; end?: number }` | — | Custom date range as Unix epoch seconds |
| `fixedTimezone` | Optional | `string` | — | IANA timezone string for timestamp display |
| `height` | Optional | `number` | — | Chart height in pixels |
| `chartTitle` | Optional | `string` | `'Tank Pressure'` | Panel heading override (pressure chart only) |
| `tankNumber` | Optional | `number \| string` | `1` | Tank index to display (temp chart only) |

## Minimal example

```tsx
import { BitdeerTankPressureCharts, BitdeerTankTempCharts } from "@tetherto/mdk-react-devkit";

<BitdeerTankPressureCharts tag="container-01" data={telemetry} timeline="24h" />
<BitdeerTankTempCharts tag="container-01" tankNumber={1} data={telemetry} timeline="24h" />
```
