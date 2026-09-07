# TimelineChart

Discrete-event timeline chart (e.g. miner state over time) with a category
legend. Supports streaming updates via `newData`.

## Props

| Prop            | Status   | Type                | Default                | Description           |
| --------------- | -------- | ------------------- | ---------------------- | --------------------- |
| `initialData`   | Required | `TimelineChartData` | —                      | Initial timeline data |
| `newData`       | Optional | `TimelineChartData` | —                      | Streaming updates appended to the initial data |
| `skipUpdates`   | Optional | `boolean`           | `false`                | Ignore `newData`      |
| `range`         | Optional | `{ min: Date \| number; max: Date \| number }` | —                      | Visible time window   |
| `axisTitleText` | Optional | `{ x; y }`          | `{ x: "Time", y: "" }` | Axis title strings    |
| `isLoading`     | Optional | `boolean`           | `false`                | Show loader           |
| `title`         | Optional | `string`            | —                      | Chart title           |
| `height`        | Optional | `number`            | —                      | Chart pixel height    |

## Example

```tsx
<TimelineChart initialData={data} range={{ min, max }} title="State" />
```

## Data contracts

`TimelineChartData` lives in [`timeline-chart.types.ts`](./timeline-chart.types.ts). Each dataset has a
`label` plus a list of `{ x: [startMs, endMs], y, mode }` items where `mode`
maps to a category color in the legend.
