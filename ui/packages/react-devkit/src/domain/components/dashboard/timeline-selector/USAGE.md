# TimelineSelector

Dropdown for picking the dashboard time range — wraps [`core/Select`](../../../../primitives/components/select/index.tsx) with the
canonical option list from `getTimelineOptions`. Pair with
`useDashboardTimeRange` from `@tetherto/mdk-react-adapter` to drive the
hashrate / consumption / power-mode chart hooks.

## Props

| Prop        | Status   | Type                     | Default                | Description                                     |
| ----------- | -------- | ------------------------ | ---------------------- | ----------------------------------------------- |
| `value`     | Required | `string`                 | —                      | Current timeline (e.g. `'1m'`, `'5m'`)          |
| `onChange`  | Required | `(next: string) => void` | —                      | Called whenever the user picks a new option     |
| `options`   | Optional | `TimelineOption[]`       | `getTimelineOptions()` | Override the list — useful for localized labels |
| `label`     | Optional | `string`                 | `"Time range"`         | aria-label / placeholder text                   |
| `className` | Optional | `string`                 | —                      | Class hook on the trigger element               |

## Example

```tsx
const { timeline, setTimeline, options } = useDashboardTimeRange()

<TimelineSelector value={timeline} onChange={setTimeline} options={options} />
```
