# BitMainCoolingSystem

Cooling subsystem panel for a BitMain container showing pumps, fans, and dry-cooler running state.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `Device` | — | Live device object |

## Minimal example

```tsx
import { BitMainCoolingSystem } from "@tetherto/mdk-react-devkit";

<BitMainCoolingSystem data={device} />
```
