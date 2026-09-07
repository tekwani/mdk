# PowerModeTimelineChart

Timeline chart for power-mode state changes over time. Wraps `TimelineChart`
with mining-specific data shaping.

## Props

| Prop          | Status   | Type                       | Default | Description                |
| ------------- | -------- | -------------------------- | ------- | -------------------------- |
| `data`        | Optional | `PowerModeTimelineEntry[]` | `[]`    | Initial power-mode entries |
| `dataUpdates` | Optional | `PowerModeTimelineEntry[]` | `[]`    | Streaming updates          |
| `isLoading`   | Optional | `boolean`                  | `false` | Show loading state         |
| `timezone`    | Optional | `string`                   | `"UTC"` | IANA timezone string       |
| `title`       | Optional | `string`                   | `CHART_TITLES.POWER_MODE_TIMELINE` | Chart title |

## Example

```tsx
<PowerModeTimelineChart data={powerModeLog} timezone="UTC" />
```

## Data contracts

`PowerModeTimelineEntry` lives in [`power-mode-timeline-chart.helper.ts`](./power-mode-timeline-chart.helper.ts).
