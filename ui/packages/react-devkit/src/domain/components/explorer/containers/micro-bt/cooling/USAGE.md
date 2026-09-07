# MicroBTCooling

Cooling-system panel for a MicroBT container. Shows CDU cycle/circulation pump states, fan control status, and cooling system health.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `Device` | — | Live device object |

## Minimal example

```tsx
import { MicroBTCooling } from "@tetherto/mdk-react-devkit";

<MicroBTCooling data={device} />
```
