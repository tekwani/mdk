# LineChartCard

Composable line-chart card with title, timeline range selector, legend
(basic or detailed), error boundary, and an optional min/max/avg footer.

Accepts either pre-shaped `data` or `rawData` + a `dataAdapter` callback so
upstream domain components can keep their data wrangling local.

## Props

| Prop               | Status   | Type                                  | Default      | Description                                                             |
| ------------------ | -------- | ------------------------------------- | ------------ | ----------------------------------------------------------------------- |
| `title`            | Optional | `string`                              | —            | Chart title                                                             |
| `data`             | Optional | `LineChartCardData`                   | —            | Pre-shaped chart data                                                   |
| `rawData`          | Optional | `unknown`                             | —            | Raw data; pair with `dataAdapter`                                       |
| `dataAdapter`      | Optional | `(rawData) => LineChartCardData`      | —            | Transforms `rawData` into chart data                                    |
| `timelineOptions`  | Optional | `TimelineOption[]`                    | —            | Range selector options                                                  |
| `timeline`         | Optional | `string`                              | —            | Controlled timeline                                                     |
| `defaultTimeline`  | Optional | `string`                              | first option | Default timeline for uncontrolled mode                                  |
| `onTimelineChange` | Optional | `(value: string) => void`             | —            | Called when user selects a new timeline                                 |
| `detailLegends`    | Optional | `boolean`                             | `false`      | Show detailed legend (current value + delta per series)                 |
| `isLoading`        | Optional | `boolean`                             | `false`      | Show loading state                                                      |
| `shouldResetZoom`  | Optional | `boolean`                             | `true`       | Reset zoom when timeline changes                                        |
| `chartProps`       | Optional | `Partial<LightWeightLineChartProps>`  | —            | Pass-through props for the underlying `LineChart`                       |
| `chartRef`         | Optional | `MutableRefObject<IChartApi \| null>` | —            | Ref to the lightweight-charts `IChartApi` instance                      |
| `minHeight`        | Optional | `number \| string`                    | `350`        | Minimum chart height                                                    |
| `headerAction`     | Optional | `ReactNode`                           | —            | Action rendered on the right of the card header (e.g. an expand toggle) |
| `titleExtra`       | Optional | `ReactNode`                           | —            | Node rendered next to the title (e.g. an info tooltip)                  |
| `className`        | Optional | `string`                              | —            | Additional class names                                                  |

## Minimal example

```tsx
<LineChartCard
  title="Hashrate"
  data={chartData}
  timelineOptions={[{ label: "5m", value: "5m" }, { label: "1h", value: "1h" }]}
  defaultTimeline="5m"
/>
```

## Data contracts

`LineChartCardData` exposes `datasets`, `minMaxAvg`, `highlightedValue`,
`footerStats`, `yTicksFormatter`, and `priceFormatter`. See [`types.ts`](./types.ts) in
the same directory for the full shape.

## Notes

- Wrapped in `withErrorBoundary` — chart-level crashes won't blow up the page
- For mining-domain charts, pair `<LineChartCard>` with adapter chart hooks
  (`useHashrateChartData`, `useSiteConsumptionChartData`) — the hooks
  return the `ChartCardData` payload pre-shaped
