# BitMainControlsTab

Read-only status tab for a BitMain immersion container: fan status, tank levels, and GPS location.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Required | `Device` | — | Live device object |

## Minimal example

```tsx
import { BitMainControlsTab } from "@tetherto/mdk-react-devkit";

<BitMainControlsTab data={device} />
```
