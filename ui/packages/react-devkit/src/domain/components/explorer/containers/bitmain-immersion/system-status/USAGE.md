# BitMainImmersionSystemStatus

Aggregated system-status card for a BitMain immersion container. Rolls up subsystem health including server start permission and connection status.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `Device` | — | Live device object |

## Minimal example

```tsx
import { BitMainImmersionSystemStatus } from "@tetherto/mdk-react-devkit";

<BitMainImmersionSystemStatus data={device} />
```
