# DoughnutChart

A Chart.js doughnut chart with a custom HTML legend, slice toggle, and percentage display.

## Props

| Prop             | Status   | Type                             | Default | Description                                                 |
| ---------------- | -------- | -------------------------------- | ------- | ----------------------------------------------------------- |
| `data`           | Required | `DoughnutChartDataset[]`         | —       | Array of labelled slices                                    |
| `unit`           | Optional | `string`                         | `''`    | Unit suffix appended to values in tooltips and legends      |
| `options`        | Optional | `ChartJS<'doughnut'>['options']` | —       | Chart.js options merged with defaults                       |
| `cutout`         | Optional | `string`                         | `'75%'` | Doughnut hole size as a percentage string                   |
| `borderWidth`    | Optional | `number`                         | `4`     | Gap between segments in pixels                              |
| `height`         | Optional | `number`                         | `260`   | Chart canvas height in pixels                               |
| `legendPosition` | Optional | `Position`                       | `'top'` | Legend placement (`'top' \| 'bottom' \| 'left' \| 'right'`) |
| `tooltip`        | Optional | `ChartTooltipConfig`             | —       | Custom HTML tooltip (replaces the built-in tooltip)         |
| `className`      | Optional | `string`                         | —       | Additional class for the root element                       |

### `DoughnutChartDataset`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `label` | `string` | yes | Slice label |
| `value` | `number` | yes | Numeric slice value |
| `color` | `string` | no | Slice color (falls back to the built-in palette) |

## Example

```tsx
import { DoughnutChart } from "@tetherto/mdk-react-devkit"

<DoughnutChart
  data={[
    { label: "Online", value: 120, color: "#34C759" },
    { label: "Offline", value: 30, color: "#FF3B30" },
    { label: "Sleeping", value: 15 },
  ]}
  unit="miners"
/>

// Legend on the right
<DoughnutChart
  data={data}
  legendPosition="right"
  cutout="60%"
/>
```

## Notes

- Clicking a legend item toggles the corresponding slice on the chart and dims the legend button
- When the `data` reference changes (labels change), all hidden states reset automatically
