# BitMain Immersion Container Components

Components for the BitMain immersion-cooled container explorer view.

| Component | Description |
|---|---|
| `BitMainImmersionSettings` | Full settings form: tank thresholds, pump curves, and limits |
| `BitMainImmersionControlBox` | Generic layout box with left/right/bottom content areas |
| `BitMainImmersionPumpStationControlBox` | Pump station status card: alarm, ready, operation, start |
| `BitMainImmersionSystemStatus` | Aggregated system-health card rolling up all subsystems |
| `BitMainControlsTab` | Read-only status tab: fan status, tank levels, and GPS location |
| `BitMainImmersionUnitControlBox` | Individual unit box (pump, dry-cooler) with frequency and status |
| `BitMainImmersionCompactUnitControlBox` | Compact variant of the unit control box |

Each of the other six components has its own props, documented in its co-located USAGE.md.

## BitMainImmersionSettings props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `Device` | — | Live device object from the devices store |
| `containerSettings` | Optional | `{ thresholds?: Record<string, unknown> } \| null` | `null` | Container settings with custom thresholds |

## Minimal example

```tsx
import { BitMainImmersionSettings } from "@tetherto/mdk-react-devkit";

<BitMainImmersionSettings data={device} />
```
