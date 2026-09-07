# MinerPowerModeSelectionButtons

Button group for selecting the operating power mode of selected miners. Reads available power modes from the device and dispatches the chosen mode through `actionsStore`.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `selectedDevices` | Optional | `Device[]` | `[]` | Devices to apply the power mode to |
| `setPowerMode` | Optional | `(devices, mode) => void` | — | Callback to apply the selected mode |
| `connectedMiners` | Optional | `Device[]` | — | Currently connected miners |
| `powerModesLog` | Optional | `UnknownRecord` | — | Log of previous power mode selections |
| `disabled` | Optional | `boolean` | `false` | Disable all buttons |
| `hasMargin` | Optional | `boolean` | `false` | Add margin around the button group |

## Minimal example

```tsx
import { MinerPowerModeSelectionButtons } from "@tetherto/mdk-react-devkit";

<MinerPowerModeSelectionButtons
  selectedDevices={[device]}
  setPowerMode={(devices, mode) => console.log(mode)}
/>
```
