# ThresholdLineChart

Line chart for time series with optional horizontal threshold lines (`thresholds`).
Includes `ChartContainer` chrome: title, legend with series toggle, and empty state.

## Props

| Prop              | Status   | Type                        | Default | Description                                      |
| ----------------- | -------- | --------------------------- | ------- | ------------------------------------------------ |
| `data`            | Optional | `ThresholdLineChartData`    | —       | `series` points plus optional `thresholds` lines |
| `title`           | Optional | `string`                    | —       | Chart title (unit appended when `unit` is set)   |
| `unit`            | Optional | `string`                    | —       | Shown in title and axis/tooltip formatting       |
| `height`          | Optional | `number`                    | `280`   | Chart height in pixels (`360` when `isTall`)     |
| `isTall`          | Optional | `boolean`                   | `false` | Taller default height                            |
| `isLegendVisible` | Optional | `boolean`                   | `true`  | Legend with click-to-hide series                 |
| `emptyMessage`    | Optional | `string`                    | —       | Message when data is missing or all zero         |
| `yTicksFormatter` | Optional | `(value: number) => string` | —       | Custom Y-axis tick labels                        |
| `className`       | Optional | `string`                    | —       | Extra class on the container                     |

## Example

```tsx
<ThresholdLineChart
  title="Power Consumption"
  unit="MW"
  data={{
    series: [
      {
        label: 'Power',
        color: '#f59e0b',
        points: [
          { timestamp: '2025-01-01T00:00:00.000Z', value: 30 },
          { timestamp: '2025-01-02T00:00:00.000Z', value: 34 },
        ],
      },
    ],
    thresholds: [{ label: 'Availability', value: 38, color: '#22c55e' }],
  }}
/>
```
