# MinerChipsCard & MinerChip

`MinerChipsCard` lists all miners in a container as selectable `MinerChip` tiles, useful for at-a-glance selection and health monitoring.

| Component | Description |
|---|---|
| `MinerChipsCard` | Container-level card rendering a grid of `MinerChip` tiles |
| `MinerChip` | Individual chip tile showing slot index, frequency, and temperature |

## MinerChipsCard Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Required | `ContainerStats` | — | Container stats including chip frequency and temperature arrays |

## MinerChip Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `index` | Required | `number` | — | Chip slot index |
| `frequency` | Required | `{ current: number }` | — | Current frequency in MHz |
| `temperature` | Required | `{ avg: number; min: number; max: number }` | — | Temperature readings in °C |

## Minimal example

```tsx
import { MinerChipsCard } from "@tetherto/mdk-react-devkit";

<MinerChipsCard data={containerStats} />
```
