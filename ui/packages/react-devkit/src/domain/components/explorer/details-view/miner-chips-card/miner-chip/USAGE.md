# MinerChip

Individual chip tile inside `MinerChipsCard`. Shows the slot index, current frequency, and average/min/max temperature.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `index` | Required | `number` | — | Chip slot index (0-based) |
| `frequency` | Required | `{ current: number }` | — | Current frequency in MHz |
| `temperature` | Required | `{ avg: number; min: number; max: number }` | — | Temperature stats in °C |

## Minimal example

```tsx
import { MinerChip } from "@tetherto/mdk-react-devkit";

<MinerChip
  index={0}
  frequency={{ current: 620 }}
  temperature={{ avg: 65, min: 62, max: 68 }}
/>
```
