# EBITDA Components

Components for the EBITDA financial reporting section.

| Component       | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `Ebitda`        | Top-level EBITDA dashboard combining metrics row, charts, and date picker  |
| `EbitdaCharts`  | Chart panel visualizing revenue, cost, and EBITDA over time                |
| `EbitdaMetrics` | Summary metric cards row: actual, hodl, selling, and production cost       |

## Ebitda Props

| Prop                     | Status   | Type                           | Default | Description                              |
| ------------------------ | -------- | ------------------------------ | ------- | ---------------------------------------- |
| `metrics`                | Required | `EbitdaDisplayMetrics \| null` | —       | Computed EBITDA metrics                  |
| `ebitdaChartInput`       | Required | `ToBarChartDataInput \| null`  | —       | Data for the EBITDA bar chart            |
| `btcProducedChartInput`  | Required | `ToBarChartDataInput \| null`  | —       | Data for the BTC produced chart          |
| `hasBtcProducedAllZeros` | Required | `boolean`                      | —       | Whether all BTC produced values are zero |
| `showEbitdaBarChart`     | Required | `boolean`                      | —       | Show the EBITDA bar chart                |
| `currentBTCPrice`        | Required | `number`                       | —       | Current Bitcoin price in USD             |
| `datePicker`             | Required | `ReactElement`                 | —       | Date picker element                      |
| `hasDateSelection`       | Required | `boolean`                      | —       | Shows the "select a period" hint instead of empty data when `false` |
| `isLoading`              | Optional | `boolean`                      | `false` | Loading state                            |
| `errors`                 | Optional | `string[]`                     | `[]`    | Error messages to display                |
| `setCostHref`            | Optional | `string`                       | —       | URL for the "Set Monthly Cost" control (hidden when omitted) |

## Minimal example

```tsx
import { Ebitda } from "@tetherto/mdk-react-devkit";

<Ebitda
  metrics={null}
  ebitdaChartInput={null}
  btcProducedChartInput={null}
  hasBtcProducedAllZeros={false}
  showEbitdaBarChart={true}
  currentBTCPrice={65000}
  datePicker={<span>Date picker</span>}
  hasDateSelection={true}
  isLoading={false}
/>
```
