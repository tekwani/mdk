# TanksBox / TankRow

`TanksBox` renders the full tank list for an immersion container, one `TankRow` per tank. Each row shows per-tank temperature, pressure, and oil/water pump running status.

## TanksBox Props

| Prop   | Status   | Type | Default | Description |
| ------ | -------- | ---- | ------- | ----------- |
| `data` | Optional | `{ oil_pump: Tank[]; water_pump: WaterPump[]; pressure: TanksBoxPressure[] }` | —       | Tank telemetry arrays; returns `null` when omitted |

## TankRow Props

| Prop               | Status   | Type              | Default | Description                                             |
| ------------------ | -------- | ----------------- | ------- | ------------------------------------------------------- |
| `label`            | Required | `string`          | —       | Tank identifier label (e.g. "Tank 1")                   |
| `temperature`      | Required | `number`          | —       | Current temperature value                               |
| `unit`             | Required | `string`          | —       | Temperature unit string (e.g. "°C")                     |
| `oilPumpEnabled`   | Required | `boolean`         | —       | Running state for the oil pump                          |
| `waterPumpEnabled` | Required | `boolean`         | —       | Running state for the water pump                        |
| `color`            | Required | `string`          | —       | CSS colour for the temperature value (threshold-driven) |
| `pressure`         | Required | `TankRowPressure` | —       | Pressure reading with optional flash/colour/tooltip     |
| `flash`            | Optional | `boolean`         | —       | Enables flash animation on the temperature row          |
| `tooltip`          | Optional | `string`          | —       | Tooltip text for the temperature value                  |

## Minimal example

```tsx
import { TanksBox } from "@tetherto/mdk-react-devkit";

<TanksBox
  data={{
    oil_pump: [{ cold_temp_c: 45, enabled: true }],
    water_pump: [{ enabled: true }],
    pressure: [{ value: 1.2 }],
  }}
/>
```
