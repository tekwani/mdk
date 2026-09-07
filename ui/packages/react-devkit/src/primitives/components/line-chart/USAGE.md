# LineChart

Time-series line chart built on `lightweight-charts`. Supports multi-series
data, custom tooltips, vertical / horizontal crosshair labels, manual zoom,
point markers, fixed-timezone formatting, and auto-scaling.

For most use cases prefer wrapping in `ChartContainer` or `LineChartCard` so
you get title, legend, range selector, and loading / empty states for free.

## Key props

| Prop              | Status   | Type                                  | Default | Description                        |
| ----------------- | -------- | ------------------------------------- | ------- | ---------------------------------- |
| `data`            | Required | `LineChartData`                       | —       | `{ datasets: LineDataset[] }`      |
| `chartRef`        | Optional | `MutableRefObject<IChartApi \| null>` | —       | Hold the underlying chart API      |
| `yTicksFormatter` | Optional | `(value: number) => string`           | —       | Y-axis tick formatter              |
| `priceFormatter`  | Optional | `(value: number) => string`           | —       | Take-precedence formatter          |
| `timeline`        | Optional | `string`                              | —       | Current timeline (drives auto-fit) |
| `fixedTimezone`   | Optional | `string`                              | —       | IANA timezone (applies offset)     |
| `unit`            | Optional | `string`                              | `""`    | Unit appended in tooltips          |
| `height`          | Optional | `number`                              | `240`   | Pixel height                       |

See [`types.ts`](./types.ts) for the full prop set (20+ props).

## Example

```tsx
<LineChart
  data={{ datasets: [{ label: "Hashrate", borderColor: "#4f9ef5", data: points }] }}
  height={320}
  unit="TH/s"
/>
```

## Data contracts

```ts
type LineDataPoint = { x: number; y: number | null | undefined };
type LineDataset = {
  label?: string;
  visible?: boolean;
  borderColor: string;
  borderWidth?: number;
  data: LineDataPoint[];
};
type LineChartData = { datasets: LineDataset[] };
```
