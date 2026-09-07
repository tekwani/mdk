# BitMainPowerAndPositioning

Power and GPS-positioning panel for a BitMain container. Shows distribution-box power consumption and rack-slot GPS coordinates.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `Device` | — | Live device object |

## Minimal example

```tsx
import { BitMainPowerAndPositioning } from "@tetherto/mdk-react-devkit";

<BitMainPowerAndPositioning data={device} />
```
