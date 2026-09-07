# Cost

Composite financial reporting page for a single mining site. Renders a page header,
a period selector slot, and a 2×2 grid of charts and metric tiles driven by the
cost-summary view model.

## Props

| Prop               | Status   | Type                                     | Default | Description                  |
| ------------------ | -------- | ---------------------------------------- | ------- | ---------------------------- |
| `metrics`          | Required | `CostSummaryDisplayMetrics \| null`      | —       | Headline $/MWh tiles (all-in, energy, operations). Pass `null` while loading. |
| `costLog`          | Required | `ReadonlyArray<CostTimeSeriesEntry>`     | —       | Monthly/weekly production-cost time series for the Production Cost / Price chart |
| `btcPriceLog`      | Required | `ReadonlyArray<BtcPriceTimeSeriesEntry>` | —       | BTC price time series aligned to `costLog` buckets |
| `totals`           | Required | `CostSummaryMonetaryTotals \| null`      | —       | Period totals (energy + operations USD) for the Operations vs Energy doughnut |
| `dateRange`        | Required | `FinancialDateRange \| null`             | —       | Active date range; drives x-axis labels across all charts |
| `controls`         | Required | `ReactElement`                           | —       | Period selector slot. Pass `<TimeframeControls>` for the OSS-style year/month picker. |
| `avgAllInCostData` | Optional | `ReadonlyArray<AvgAllInCostDataPoint>`   | —       | Revenue/cost series for the Avg All-in Cost bar chart (sourced separately from cost-summary) |
| `setCostAction`    | Optional | `ReactElement`                           | —       | Optional header action slot (e.g. a "Set Monthly Cost" link or button) |
| `isLoading`        | Optional | `boolean`                                | `false` | Shows a loading spinner overlay over the chart grid |
| `error`            | Optional | `unknown`                                | —       | When truthy, renders an error message in place of the chart grid |

## Minimal example

```tsx
import {
  buildCostSummaryViewModel,
  Cost,
  PERIOD,
  TimeframeControls,
} from "@tetherto/mdk-react-devkit/domain";

const viewModel = buildCostSummaryViewModel({ data: costSummaryApiResponse });

<Cost
  metrics={viewModel.metrics}
  costLog={viewModel.costLog}
  btcPriceLog={viewModel.btcPriceLog}
  totals={viewModel.totals}
  dateRange={{ start, end, period: PERIOD.MONTHLY }}
  controls={<TimeframeControls dateRange={{ start, end }} onRangeChange={handleChange} />}
/>
```

## Notes

- Use `buildCostSummaryViewModel` to transform the raw API response into the props this component expects
- `avgAllInCostData` comes from a separate endpoint (`useAvgAllInPowerCostData` in the OSS app) — omit it to hide the Avg All-in Cost panel
- For a custom page layout (different header, navigation), mount `CostContent` directly instead and supply your own Chrome
- Multi-site aggregation is out of scope for this component; mount one `Cost` per site and compose them yourself
