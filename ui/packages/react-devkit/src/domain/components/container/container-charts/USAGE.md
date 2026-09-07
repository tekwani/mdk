# ContainerCharts

Multi-series time-series chart panel used by container detail views to display temperature, pressure, and power data over configurable time windows. Supports paired-index expansion for dual-tank (Bitdeer) and dual-supply (Bitmain Immersion) container types.

## Props

| Prop                          | Status   | Type                                        | Default              | Description                                       |
| ----------------------------- | -------- | ------------------------------------------- | -------------------- | ------------------------------------------------- |
| `combinations`                | Required | `ContainerChartCombinationOption[]`         | —                    | Options for the combination selector              |
| `featureEnabled`              | Optional | `boolean`                                   | `true`               | When `false`, shows an empty state (feature gate) |
| `disabledMessage`             | Optional | `string`                                    | `'Container Charts feature is not enabled'` | Message shown when `featureEnabled` is `false`    |
| `isLoadingCombinations`       | Optional | `boolean`                                   | `false`              | Loading state for combination options             |
| `title`                       | Optional | `string`                                    | `'Container Charts'` | Section heading                                   |
| `selectedCombination`         | Optional | `string \| null`                            | —                    | Controlled selected combination value             |
| `defaultSelectedCombination`  | Optional | `string \| null`                            | `null`               | Initial selection when uncontrolled               |
| `onSelectedCombinationChange` | Optional | `(value: string \| null) => void`           | —                    | Called when the selected combination changes      |
| `chartRawData`                | Optional | `ChartEntry[] \| null`                      | `null`               | Raw overview stats rows passed to chart adapters  |
| `isLoadingCharts`             | Optional | `boolean`                                   | `false`              | Loading state for the chart panels                |
| `getDatasetBorderColor`       | Optional | `ContainerChartsDatasetBorderColorResolver` | —                    | Optional per-dataset line colors after adapters run (e.g. demo or host branding) |

## Minimal example

```tsx
import { ContainerCharts } from "@tetherto/mdk-react-devkit";

<ContainerCharts combinations={[]} />
```
