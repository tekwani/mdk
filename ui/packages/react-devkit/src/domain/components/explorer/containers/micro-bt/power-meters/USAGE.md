# PowerMeters

Power-meter panel for a MicroBT container showing voltage (AB/BC/CA), power factor, and frequency for each distribution circuit.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `Device` | — | Live device object |

## Minimal example

```tsx
import { PowerMeters } from "@tetherto/mdk-react-devkit";

<PowerMeters data={device} />
```
