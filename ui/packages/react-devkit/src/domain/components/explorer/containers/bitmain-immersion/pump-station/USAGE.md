# BitMainImmersionPumpStationControlBox

Pump-station status card showing alarm, ready, operation, and start states for a BitMain immersion container's pump station.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | Optional | `string` | — | Card heading |
| `alarmStatus` | Optional | `boolean` | `false` | Whether an alarm is active |
| `ready` | Optional | `boolean` | — | Pump station is in ready state |
| `operation` | Optional | `boolean` | — | Pump station is in operation |
| `start` | Optional | `boolean` | — | Pump station has started |
| `className` | Optional | `string` | — | Additional CSS class |

## Minimal example

```tsx
import { BitMainImmersionPumpStationControlBox } from "@tetherto/mdk-react-devkit";

<BitMainImmersionPumpStationControlBox
  title="Pump Station A"
  ready={true}
  operation={true}
  start={true}
  alarmStatus={false}
/>
```
