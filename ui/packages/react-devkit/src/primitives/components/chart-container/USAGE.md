# ChartContainer

A layout wrapper for charts that provides a title/header row, interactive legend, range selector, highlighted value display, loading/empty states, and a stats footer.

## Props

| Prop               | Status   | Type                      | Default               | Description                                                   |
| ------------------ | -------- | ------------------------- | --------------------- | ------------------------------------------------------------- |
| `children`         | Required | `React.ReactNode`         | —                     | The chart element to render                                   |
| `title`            | Optional | `string`                  | —                     | Chart heading (renders as `<h3>` unless `header` is provided) |
| `header`           | Optional | `React.ReactNode`         | —                     | Replaces the default `title` heading with a custom element    |
| `legendData`       | Optional | `LegendItem[]`            | —                     | Color-keyed legend items; each item can be toggled            |
| `highlightedValue` | Optional | `HighlightedValueProps`   | —                     | Large value/unit displayed alongside the legend               |
| `rangeSelector`    | Optional | `RangeSelectorProps`      | —                     | Radio-card time-range selector                                |
| `loading`          | Optional | `boolean`                 | —                     | Shows a centered `<Loader>` overlay                           |
| `empty`            | Optional | `boolean`                 | —                     | Hides the chart and shows `emptyMessage`                      |
| `emptyMessage`     | Optional | `string`                  | `'No data available'` | Message shown when `empty` is true                            |
| `minMaxAvg`        | Optional | `MinMaxAvg`               | —                     | Built-in footer showing Min / Avg / Max values                |
| `timeRange`        | Optional | `string`                  | —                     | Time range label shown in the footer                          |
| `footer`           | Optional | `React.ReactNode`         | —                     | Custom footer content rendered below the chart                |
| `footerClassName`  | Optional | `string`                  | —                     | Additional class for the footer area                          |
| `onToggleDataset`  | Optional | `(index: number) => void` | —                     | Fired when a legend item is clicked                           |
| `className`        | Optional | `string`                  | —                     | Additional class for the root element                         |

### `LegendItem`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `label` | `string` | yes | Legend label |
| `color` | `string` | yes | Color string (hex, hsl, etc.) |
| `hidden` | `boolean` | no | Whether this dataset is currently hidden |

### `HighlightedValueProps`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `value` | `string \| number` | yes | The primary value to display |
| `unit` | `string` | no | Unit suffix |
| `className` | `string` | no | Additional class |
| `style` | `React.CSSProperties` | no | Inline style |

### `RangeSelectorProps`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `options` | `RangeSelectorOption[]` | yes | `{ label, value }` items |
| `value` | `string` | yes | Currently selected value |
| `onChange` | `(value: string) => void` | yes | Fires when user picks a range |

## Example

```tsx
import { ChartContainer, BarChart } from "@tetherto/mdk-react-devkit"

<ChartContainer
  title="Hashrate"
  loading={isLoading}
  empty={!data.length}
  legendData={[{ label: "Pool A", color: "#59E8E8" }]}
  rangeSelector={{ options: [{ label: "1H", value: "1h" }, { label: "24H", value: "24h" }], value: range, onChange: setRange }}
  minMaxAvg={{ min: "10 TH/s", avg: "55 TH/s", max: "100 TH/s" }}
  onToggleDataset={(i) => toggleDataset(i)}
>
  <BarChart data={chartData} />
</ChartContainer>
```

## Notes

- `minMaxAvg` and `timeRange` are only rendered when the chart is not loading or empty
