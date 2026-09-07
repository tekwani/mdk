# AverageDowntimeChart

Stacked bar chart of Curtailment vs Op. Issues downtime rates. Includes
`ChartContainer` chrome: title, unit subtitle, loading, and empty state.

## Props

| Prop              | Status   | Type                        | Default                    | Description                                   |
| ----------------- | -------- | --------------------------- | -------------------------- | --------------------------------------------- |
| `data`            | Optional | `AverageDowntimeChartData`  | —                          | Period labels and rate arrays (fractions 0–1) |
| `title`           | Optional | `string`                    | `Monthly Average Downtime` | Chart title (unit renders on its own line below) |
| `unit`            | Optional | `string`                    | `%`                        | Unit subtitle under the title                 |
| `height`          | Optional | `number`                    | `280`                      | Chart height in pixels                        |
| `barWidth`        | Optional | `number`                    | `38`                       | Max bar thickness                             |
| `yTicksFormatter` | Optional | `(value: number) => string` | rate × 100 via `formatNumber` | Axis, tooltip, and data labels (input is 0–1 rate) |
| `showDataLabels`  | Optional | `boolean`                   | `false`                    | Show values above stacked bars                |
| `isLoading`       | Optional | `boolean`                   | `false`                    | Shows loading overlay                         |
| `emptyMessage`    | Optional | `string`                    | —                          | Message when there are no period labels or rate series |
| `className`       | Optional | `string`                    | —                          | Extra class on the container                  |

## Example

```tsx
<AverageDowntimeChart
  data={{
    labels: ['Jan', 'Feb'],
    curtailment: [0.02, 0.01],
    operationalIssues: [0.05, 0.04],
  }}
/>
```
