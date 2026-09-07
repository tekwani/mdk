# TimeframeControls & TimeframeWeekTreeContent

Controls for selecting a reporting time frame: year, month, and optional week picker.

| Component                  | Description                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `TimeframeControls`        | Full time-frame picker: year, month, and optional week selection in horizontal or stacked layout   |
| `TimeframeWeekTreeContent` | Hierarchical year → month → week tree used inside `TimeframeControls`                              |

## TimeframeControls Props

| Prop                    | Status   | Type                             | Default        | Description                             |
| ----------------------- | -------- | -------------------------------- | -------------- | --------------------------------------- |
| `hint`                  | Optional | `string`                         | —              | Helper text below the controls          |
| `dateRange`             | Optional | `{ start: number; end: number }` | —              | Current date range                      |
| `isMonthSelectVisible`  | Optional | `boolean`                        | `true`         | Show month selector                     |
| `isWeekSelectVisible`   | Optional | `boolean`                        | `true`         | Show week selector                      |
| `onRangeChange`         | Optional | `(range: [Date, Date], options: Partial<{ year: number; month: number; period: string }>) => void` | —              | Called when the range changes |
| `timeframeType`         | Optional | `'year' \| 'week' \| 'month' \| null` | —              | Active timeframe type                   |
| `onTimeframeTypeChange` | Optional | `(type: 'year' \| 'week' \| 'month') => void` | —              | Called when timeframe type changes |
| `layout`                | Optional | `'horizontal' \| 'stacked'`      | `'horizontal'` | Layout direction                        |
| `showResetButton`       | Optional | `boolean`                        | `false`        | Shows the Reset button                  |
| `onReset`               | Optional | `VoidFunction`                   | —              | Called when the Reset button is clicked |

## Minimal example

```tsx
import { TimeframeControls } from "@tetherto/mdk-react-devkit";

<TimeframeControls
  onRangeChange={(range) => console.log(range)}
/>
```
