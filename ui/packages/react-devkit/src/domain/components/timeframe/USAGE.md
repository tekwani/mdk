# Timeframe

Date-range helpers for reporting views. The timeframe pickers live alongside, in [`timeframe-controls`](./timeframe-controls/USAGE.md) and [`report-time-frame-selector`](./report-time-frame-selector/USAGE.md).

| Export | Description |
|---|---|
| `useFinancialDateRange` | Hook for managing financial date-range state (period, year, month). |

## `useFinancialDateRange`

```tsx
import { useFinancialDateRange } from "@tetherto/mdk-react-devkit";

const { dateRange, period, setYear, setMonth } = useFinancialDateRange({ defaultPeriod: "monthly" });
```
