# DryCooler

Dry-cooler subsystem panel for Bitdeer containers. Shows two cooler groups with individual fan status indicators (on/off) and pump controls. Derives data from `container_specific.cooling_system` on the device object.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `UnknownRecord` | — | Container settings payload. `cooling_system.dry_cooler` is read for fan state; `cooling_system.oil_pump` and `cooling_system.water_pump` are read for pump state. |

## Minimal example

```tsx
import { DryCooler } from "@tetherto/mdk-react-devkit";

<DryCooler data={containerData} />
```
