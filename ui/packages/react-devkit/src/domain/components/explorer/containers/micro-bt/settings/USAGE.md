# MicroBTSettings

Settings form for a MicroBT container with vendor-specific operating limits (temperature thresholds, cooling parameters).

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `Device` | — | Live device object |
| `containerSettings` | Optional | `{ thresholds?: Record<string, unknown> } \| null` | `null` | Container-level threshold overrides |

## Minimal example

```tsx
import { MicroBTSettings } from "@tetherto/mdk-react-devkit";

<MicroBTSettings data={device} />
```
