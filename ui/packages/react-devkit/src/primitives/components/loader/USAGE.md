# Loader

A pulsing dots loading animation. Use it as an inline loading indicator or inside chart/card overlay slots.

## Props

| Prop        | Status   | Type          | Default    | Description                           |
| ----------- | -------- | ------------- | ---------- | ------------------------------------- |
| `size`      | Optional | `number`      | `10`       | Diameter of each dot in pixels        |
| `count`     | Optional | `3 \| 5 \| 7` | `5`        | Number of dots                        |
| `color`     | Optional | `'red' \| 'gray' \| 'blue' \| 'amber' \| 'orange'` | `'orange'` | Dot color variant                     |
| `inline`    | Optional | `boolean`     | `false`    | Inline activity indicator rather than a block loading state |
| `className` | Optional | `string`      | —          | Additional class for the root element |

All other `div` HTML attributes are forwarded.

## Block or inline — pick deliberately

The default is a **block** loading state: a fixed 200px tall box with the dots centred, so a
panel standing in for content that has not arrived does not collapse and then jump when it
does. That is what every `isLoading ? <Loader /> : …` call site wants.

**Pass `inline` for an indicator inside a flow of content** — a chat transcript, a row, next to
a label. Without it the 200px applies there too, stranding the dots ~100px below the thing they
belong to and centring them against left-aligned text, which reads as a frozen UI rather than a
working one.

## Example

```tsx
import { Loader } from "@tetherto/mdk-react-devkit"

// Block: standing in for content that has not arrived
<Loader />

// Smaller with fewer dots
<Loader size={8} count={3} color="blue" />

// Inline: something is happening, in place
<Loader inline size={6} count={3} />
```
