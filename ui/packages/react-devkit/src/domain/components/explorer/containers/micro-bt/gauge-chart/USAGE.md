# GaugeChartComponent

Arc-gauge chart for displaying a single metric against its maximum range. Used in MicroBT container views for temperature and pressure readings.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `max` | Required | `number` | — | Maximum gauge value |
| `value` | Required | `number` | — | Current reading |
| `label` | Optional | `string` | `''` | Chart title |
| `unit` | Required | `string` | — | Unit of measurement (e.g. `"°C"`, `"bar"`) |
| `chartStyle` | Optional | `React.CSSProperties` | `{}` | Custom inline styles for the chart wrapper |
| `colors` | Optional | `string[]` | `[COLOR.EMERALD, COLOR.SOFT_TEAL]` | HEX color stops for the arc gradient |
| `hideText` | Optional | `boolean` | `true` | Hide the percentage text inside the chart |
| `height` | Optional | `number` | `200` | Chart height in pixels |
| `className` | Optional | `string` | — | Additional CSS class |

## Minimal example

```tsx
import { GaugeChartComponent } from "@tetherto/mdk-react-devkit";

<GaugeChartComponent max={100} value={72} label="Temperature" unit="°C" />
```
