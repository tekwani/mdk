# EfficiencySiteView

Site-level efficiency tab inside `OperationsEfficiency`. Shows an efficiency chart and summary table for the whole mining site.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `log` | Optional | `MetricsEfficiencyLogEntry[]` | `[]` | Efficiency log entries |
| `avgEfficiency` | Optional | `number \| null` | `null` | Average efficiency value |
| `nominalValue` | Optional | `number \| null` | `null` | Nominal target efficiency |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `dateRange` | Optional | `EfficiencyDateRange` | — | Selected date range |
| `onDateRangeChange` | Optional | `(range) => void` | — | Date range change handler |
| `onReset` | Optional | `VoidFunction` | — | Reset handler |

## Minimal example

```tsx
import { EfficiencySiteView } from "@tetherto/mdk-react-devkit";

<EfficiencySiteView isLoading={false} log={[]} />
```
