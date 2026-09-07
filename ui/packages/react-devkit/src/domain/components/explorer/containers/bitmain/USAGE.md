# BitMain Hydro Container Components

Components for the BitMain hydro-cooled container explorer view.

| Component | Description |
|---|---|
| `BitMainHydroSettings` | Full settings form: basic settings, threshold configuration for water temperature and pressure |
| `BitMainBasicSettings` | Cooling system status, power distribution, and GPS positioning |
| `BitMainCoolingSystem` | Pumps, fans, and dry-cooler status panel |
| `BitMainPowerAndPositioning` | Power circuits, phase readings, and rack-slot GPS coordinates |
| `StatusItem` | Compact labelled status pill for boolean or enum readings |

## Props

**BitMainHydroSettings / BitMainBasicSettings / BitMainCoolingSystem / BitMainPowerAndPositioning**

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `Device` | — | Live device object from the devices store |

**StatusItem**

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | Optional | `string` | — | Display label for the status |
| `status` | Optional | `StatusType` | — | Status value that drives the colour indicator |

## Minimal example

```tsx
import { BitMainHydroSettings, StatusItem } from "@tetherto/mdk-react-devkit";

<BitMainHydroSettings data={device} />
<StatusItem label="Circulation Pump" status="normal" />
```
