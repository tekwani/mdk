# `WidgetTopRow`

Compact header row used at the top of container / miner widgets — title,
per-category alarm badges, and the current power reading (or an error tooltip).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `title` | Required | `string` | - | Widget title |
| `alarms` | Optional | `WidgetAlarmGroup[]` | - | Alarm category badges, in display order. Categories with no items render nothing |
| `className` | Optional | `string` | - | Additional class names |
| `power` | Optional | `number` | - | Power reading; rendered in kilo-units |
| `statsErrorMessage` | Optional | `string \| ErrorWithTimestamp[] \| null` | - | Error tooltip content; replaces power |
| `unit` | Optional | `string` | - | Power unit (e.g. `"kW"`) |

### `WidgetAlarmGroup`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `icon` | Required | `React.ReactNode` | - | Badge icon |
| `title` | Required | `string` | - | Category label; the tooltip heading reads `<title> issues` |
| `items` | Optional | `AlertRecord[]` | - | Active alerts in this category; the badge is hidden when empty |
<!-- END GENERATED: props -->

## Example

```tsx
import { PressureAlarmIcon, WidgetTopRow } from "@tetherto/mdk-react-devkit"

<WidgetTopRow
  title="Container 03"
  power={31500}
  unit="kW"
  alarms={[{ title: "Pressure", icon: <PressureAlarmIcon />, items: pressureAlerts }]}
/>
```

You choose the alarm categories: pass one `{ title, icon, items }` per badge, in
display order. The alarm icons in `@tetherto/mdk-react-devkit/primitives`
(`TemperatureAlarmIcon`, `FluidAlarmIcon`, `PressureAlarmIcon`, `OtherAlarmIcon`)
cover the usual cooling categories.

## Notes

- Uses `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap in
  `<MdkProvider>`
