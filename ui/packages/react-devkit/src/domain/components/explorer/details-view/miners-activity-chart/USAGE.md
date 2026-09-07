# MinersActivityChart

Stacked-area chart of miner-state counts (online / offline / faulted) over the selected time window. Built on Chart.js via `react-chartjs-2`.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `MinersActivityData` | `{}` | Time-series data for online/offline/faulted counts |
| `large` | Optional | `boolean` | `false` | Use tall variant |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
| `isError` | Optional | `boolean` | `false` | Show error state |
| `error` | Optional | `MinerActivityChartErrorProp \| null` | `null` | Error details to display |
| `showLabel` | Optional | `boolean` | `true` | Show axis labels |
| `isDemoMode` | Optional | `boolean` | `false` | Use demo/mock data |
| `variant` | Optional | `MinersActivityVariant` | `'indicators'` | Visual style for the per-status items; `indicators` renders coloured dots and `tiles` renders tinted status tiles |

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
