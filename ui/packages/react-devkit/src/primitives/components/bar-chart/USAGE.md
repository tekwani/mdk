# BarChart

A Chart.js bar chart with gradient fills, optional stacking, horizontal layout, data labels, and a custom HTML tooltip.

## Props

| Prop              | Status   | Type                        | Default   | Description                                                  |
| ----------------- | -------- | --------------------------- | --------- | ------------------------------------------------------------ |
| `data`            | Required | `any`                       | —         | Chart.js dataset object (`{ labels, datasets }`)             |
| `options`         | Optional | `ChartJS<'bar'>['options']` | —         | Extra Chart.js options merged with the MDK defaults          |
| `isStacked`       | Optional | `boolean`                   | `false`   | Stacks datasets on top of each other                         |
| `isHorizontal`    | Optional | `boolean`                   | `false`   | Renders bars horizontally (sets `indexAxis: 'y'`)            |
| `formatYLabel`    | Optional | `(value: number) => string` | —         | Formats Y-axis tick labels                                   |
| `showLegend`      | Optional | `boolean`                   | `true`    | Displays the Chart.js built-in legend                        |
| `legendPosition`  | Optional | `Position`                  | `'top'`   | Legend placement (`'top' \| 'bottom' \| 'left' \| 'right'`)  |
| `legendAlign`     | Optional | `FlexAlign`                 | `'start'` | Horizontal alignment of legend labels                        |
| `showDataLabels`  | Optional | `boolean`                   | `false`   | Renders values above each bar                                |
| `formatDataLabel` | Optional | `(value: number) => string` | —         | Formats the data label text                                  |
| `tooltip`         | Optional | `ChartTooltipConfig`        | —         | Custom HTML tooltip configuration (replaces the default Chart.js tooltip) |
| `height`          | Optional | `number`                    | `300`     | Chart height in pixels                                       |
| `className`       | Optional | `string`                    | —         | Additional class for the wrapper `div`                       |

## Example

```tsx
import { BarChart } from "@tetherto/mdk-react-devkit"

const data = {
  labels: ["Jan", "Feb", "Mar"],
  datasets: [
    {
      label: "Hashrate",
      data: [120, 95, 140],
      backgroundColor: "#59E8E8",
    },
  ],
}

<BarChart data={data} height={280} formatYLabel={(value) => `${value} TH/s`} />

// Stacked with data labels
<BarChart
  data={stackedData}
  isStacked
  showDataLabels
  formatDataLabel={(value) => `${value}%`}
/>
```

## Notes

- Bar datasets automatically receive a vertical gradient fill derived from `backgroundColor`. Pass `backgroundColor` as a function to opt out.
- For mixed bar + line charts pass the dataset `type: 'line'` inside `data.datasets` and use `data` typed as `any`
- `showDataLabels` adds `chartjs-plugin-datalabels`; it adds 20 px of top padding to prevent label clipping
