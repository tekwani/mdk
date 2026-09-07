# ReportTimeFrameSelector

Reporting-period picker with preset windows (1d / 7d / 30d / custom range). Used in financial reporting sections to control the visible date range.

## Props

| Prop                 | Status   | Type                              | Default | Description                                 |
| -------------------- | -------- | --------------------------------- | ------- | ------------------------------------------- |
| `presetTimeFrame`    | Required | `number \| null`                  | —       | Selected preset in days (`1`, `7`, `30`); `null` means the custom range is active |
| `dateRange`          | Required | `[Date, Date]`                    | —       | Custom date range as a `[start, end]` tuple |
| `setPresetTimeFrame` | Required | `(value: number \| null) => void` | —       | Update the preset selection                 |
| `setDateRange`       | Required | `(range: [Date, Date]) => void`   | —       | Update the custom date range                |

## Minimal example

```tsx
import { ReportTimeFrameSelector } from "@tetherto/mdk-react-devkit";

<ReportTimeFrameSelector
  presetTimeFrame={30}
  dateRange={[new Date(), new Date()]}
  setPresetTimeFrame={(value) => setState(value)}
  setDateRange={(r) => setRange(r)}
/>
```
