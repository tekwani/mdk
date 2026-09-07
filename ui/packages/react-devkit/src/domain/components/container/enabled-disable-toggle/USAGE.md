# EnabledDisableToggle

Switch with confirmation that enables or disables a container tank, miner, or feature flag. Renders a switch when the current state is known (boolean), or Enable/Disable buttons when state is unknown. Disables all controls when the container is offline.

## Props

| Prop               | Status   | Type               | Default | Description                                                                                                 |
| ------------------ | -------- | ------------------ | ------- | ----------------------------------------------------------------------------------------------------------- |
| `value`            | Required | `unknown`          | —       | Current state. A boolean drives a switch display; non-boolean shows action buttons.                         |
| `tankNumber`       | Required | `number \| string` | —       | Tank identifier used in the label (`Tank {N} Circulation`). Pass an empty string for the air exhaust label. |
| `isButtonDisabled` | Required | `boolean`          | —       | Disables the Enable/Disable buttons when a command is in-flight                                             |
| `isOffline`        | Required | `boolean`          | —       | Disables all controls and shows an offline tooltip                                                          |
| `onToggle`         | Required | `(params: { tankNumber; isOn }) => void` | —       | Callback fired when the user confirms a state change                                                        |

## Minimal example

```tsx
import { EnabledDisableToggle } from "@tetherto/mdk-react-devkit";

<EnabledDisableToggle
  value={true}
  tankNumber={1}
  isButtonDisabled={false}
  isOffline={false}
  onToggle={({ tankNumber, isOn }) => console.log(tankNumber, isOn)}
/>
```
