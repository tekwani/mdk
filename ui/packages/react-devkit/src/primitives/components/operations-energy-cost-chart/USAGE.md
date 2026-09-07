# OperationsEnergyCostChart

Doughnut chart comparing Operations and Energy cost ($/MWh). Includes
`ChartContainer` chrome: title, unit subtitle, loading, and empty state.

## Props

| Prop           | Status   | Type      | Default | Description                                 |
| -------------- | -------- | --------- | ------- | ------------------------------------------- |
| `data`         | Optional | `OperationsEnergyCostChartData` | —       | `operationalCostsUSD` and `energyCostsUSD`  |
| `title`        | Optional | `string`  | `Operations vs Energy Cost` | Chart title                                 |
| `unit`         | Optional | `string`  | `$/MWh` | Subtitle and tooltip unit label             |
| `height`       | Optional | `number`  | `200`   | Doughnut height in pixels                   |
| `isLoading`    | Optional | `boolean` | `false` | Shows loading overlay on the chart area     |
| `emptyMessage` | Optional | `string`  | —       | Message when both costs are zero or missing |
| `className`    | Optional | `string`  | —       | Extra class on the container                |

## Example

```tsx
<OperationsEnergyCostChart
  data={{
    operationalCostsUSD: 1000,
    energyCostsUSD: 500,
  }}
/>
```
