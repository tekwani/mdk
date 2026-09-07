# Loader

A pulsing dots loading animation. Use it as an inline loading indicator or inside chart/card overlay slots.

## Props

| Prop        | Status   | Type          | Default    | Description                           |
| ----------- | -------- | ------------- | ---------- | ------------------------------------- |
| `size`      | Optional | `number`      | `10`       | Diameter of each dot in pixels        |
| `count`     | Optional | `3 \| 5 \| 7` | `5`        | Number of dots                        |
| `color`     | Optional | `'red' \| 'gray' \| 'blue' \| 'amber' \| 'orange'` | `'orange'` | Dot color variant                     |
| `className` | Optional | `string`      | —          | Additional class for the root element |

All other `div` HTML attributes are forwarded.

## Example

```tsx
import { Loader } from "@tetherto/mdk-react-devkit"

// Default
<Loader />

// Smaller with fewer dots
<Loader size={8} count={3} color="blue" />
```
