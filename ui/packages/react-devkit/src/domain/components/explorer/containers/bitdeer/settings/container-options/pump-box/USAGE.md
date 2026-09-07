# PumpBox

Single-pump status card showing RPM, flow, and fault state for one immersion-cooling pump. Renders a coloured indicator (green = running, grey = off). Returns `null` if `pumpItem.enabled` is not a boolean.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `pumpTitle` | Required | `string` | — | Label prefix for the pump (e.g. `"Circulation"`) |
| `pumpItem` | Optional | `{ enabled?: boolean; index: number }` | — | Pump data. `index` is 0-based; displayed as `index + 1`. |

## Minimal example

```tsx
import { PumpBox } from "@tetherto/mdk-react-devkit";

<PumpBox pumpTitle="Circulation" pumpItem={{ enabled: true, index: 0 }} />
```
