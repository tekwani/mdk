# SubsidyFee

Financial dashboard section for subsidy and fee reporting. Shows a summary with optional fee log entries and allows date-range filtering.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `isError` | Optional | `boolean` | `false` | Show error state |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
| `errorMessage` | Optional | `string` | `'Error loading block data. Please try again later.'` | Error message to display |
| `showSummaryCards` | Optional | `boolean` | `false` | Show summary stat cards |
| `log` | Optional | `SubsidyFeesLogEntry[]` | — | Fee log entries |
| `data` | Optional | `SubsidyFeesResponse \| null` | — | Subsidy fee data |
| `onDateRangeChange` | Optional | `(dateRange, query) => void` | — | Called when date range changes |

## Minimal example

```tsx
import { SubsidyFee } from "@tetherto/mdk-react-devkit";

<SubsidyFee isLoading={false} showSummaryCards={true} log={[]} data={null} />
```
