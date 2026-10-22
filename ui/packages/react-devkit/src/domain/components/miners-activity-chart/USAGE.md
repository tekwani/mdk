# `MinersActivityChart`

Stacked-area chart of miner-state counts (online / offline / faulted) over the selected time window. Built on Chart.js via `react-chartjs-2`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `MinersActivityData` | `{}` | Time-series data for online/offline/faulted counts |
| `error` | Optional | `MinerActivityChartErrorProp \| null` | `null` | Error details to display |
| `isDemoMode` | Optional | `boolean` | `false` | Use demo/mock data |
| `isError` | Optional | `boolean` | `false` | Show error state |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
| `large` | Optional | `boolean` | `false` | Use tall variant |
| `showLabel` | Optional | `boolean` | `true` | Show axis labels |
| `variant` | Optional | `"indicators" \| "tiles"` | `"indicators"` | `indicators` (default) renders coloured dots; `tiles` renders tinted status tiles |

### `MinersActivityData`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `total` | Optional | `number` | - | Total miner count; not rendered, since each tile reads its own status key (e.g. `offline`, `error`, `sleep`) and shows 0 when absent |

### `MinerActivityChartErrorProp`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `{ message?: string }` | - | Error payload; `message` becomes the error alert description when `isError` is set, else a generic retry hint |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MinersActivityChart } from "@tetherto/mdk-react-devkit";

<MinersActivityChart
  data={{ online: [], offline: [], faulted: [] }}
  large={false}
  isLoading={false}
  isError={false}
  error={null}
  showLabel={true}
  isDemoMode={true}
/>
```
