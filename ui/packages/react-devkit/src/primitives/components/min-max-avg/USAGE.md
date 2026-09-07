# MinMaxAvg

Displays Min, Max, and Avg labels with MDK chart footer styling (orange labels, grey values).

## Props

| Prop        | Status   | Type     | Default | Description                     |
| ----------- | -------- | -------- | ------- | ------------------------------- |
| `min`       | Optional | `string` | —       | Minimum value (hidden if empty) |
| `max`       | Optional | `string` | —       | Maximum value (hidden if empty) |
| `avg`       | Optional | `string` | —       | Average value (hidden if empty) |
| `className` | Optional | `string` | —       | Additional root class           |

## Usage

```tsx
import { MinMaxAvg } from "@tetherto/mdk-react-devkit/primitives"

<MinMaxAvg min="10 TH/s" max="100 TH/s" avg="55 TH/s" />
```

Use with `ChartContainer` via the `minMaxAvg` prop (pre-formatted strings) or the `footer` slot.

With numeric data, pair `computeStats` and `formatMinMaxAvg` from chart utils:

```tsx
import { computeStats, formatMinMaxAvg } from "@tetherto/mdk-react-devkit/primitives"

const stats = computeStats(values)
const minMaxAvg = formatMinMaxAvg(stats, (v, key) =>
  key === "avg" ? `${v.toFixed(1)} TH/s` : `${v} TH/s`,
)
```
