# BitMainImmersionUnitControlBox / BitMainImmersionCompactUnitControlBox

Individual unit control box for a pump or dry-cooler within a BitMain immersion container. `BitMainImmersionUnitControlBox` displays running state, frequency, and alarm status. `BitMainImmersionCompactUnitControlBox` is a compact variant showing open/closed status with transition states, for units like valves.

## BitMainImmersionUnitControlBox props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | Optional | `string` | — | Unit label (e.g. `"Pump 1"`) |
| `alarmStatus` | Optional | `boolean` | `false` | Whether an alarm is active |
| `frequency` | Optional | `number` | — | Current operating frequency in Hz |
| `isDryCooler` | Optional | `boolean` | `false` | Render as dry-cooler variant |
| `running` | Optional | `boolean` | `false` | Whether the unit is running |
| `showFrequencyInLeftColumn` | Optional | `boolean` | `false` | Show frequency in the left column instead of the right |
| `secondary` | Optional | `boolean` | `false` | Secondary variant with no border |
| `className` | Optional | `string` | — | Custom class name |

## BitMainImmersionCompactUnitControlBox props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | Optional | `string` | — | Unit label (e.g. `"Valve Control"`) |
| `opening` | Optional | `boolean` | `false` | Show the "Opening" transition state |
| `closing` | Optional | `boolean` | `false` | Show the "Closing" transition state |
| `isOpen` | Optional | `boolean` | `false` | Whether the unit is currently open |
| `className` | Optional | `string` | — | Custom class name |

## Minimal example

```tsx
import {
  BitMainImmersionUnitControlBox,
  BitMainImmersionCompactUnitControlBox,
} from "@tetherto/mdk-react-devkit";

<BitMainImmersionUnitControlBox
  title="Pump 1"
  running={true}
  frequency={50}
  alarmStatus={false}
/>

<BitMainImmersionCompactUnitControlBox title="Valve Control" isOpen={true} />
```
