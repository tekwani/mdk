# GaugeChart

A gauge / speedometer chart drawn as pure inline SVG (no third-party runtime
dependency). Accepts a `percent` value between 0 and 1 and displays it as a
coloured arc.

## Props

| Prop              | Status   | Type                          | Default                    | Description                                                                            |
| ----------------- | -------- | ----------------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| `percent`         | Required | `number`                      | —                          | Fill level between `0` (empty) and `1` (full); clamped                                 |
| `colors`          | Optional | `string[]`                    | `[COLOR.GREEN, COLOR.RED]` | Arc segment colors in HEX format, from low to high                                     |
| `arcWidth`        | Optional | `number`                      | `0.2`                      | Thickness of the arc relative to the chart radius (0–1)                                |
| `nrOfLevels`      | Optional | `number`                      | `3`                        | Number of even arc segments (ignored when `arcsLength` is set)                         |
| `arcsLength`      | Optional | `number[]`                    | —                          | Custom arc proportions (auto-normalised), e.g. `[0.7, 0.3]` for a progress-style gauge |
| `needleColor`     | Optional | `string`                      | `COLOR.STEEL_GRAY`         | Needle + hub colour                                                                    |
| `hideNeedle`      | Optional | `boolean`                     | `false`                    | Hide the needle + hub (e.g. progress-style gauge)                                      |
| `formatTextValue` | Optional | `(percent: number) => string` | —                          | Format the centre label from the clamped fraction (0–1)                                |
| `hideText`        | Optional | `boolean`                     | `false`                    | Hides the text in the center                                                           |
| `id`              | Optional | `string`                      | `'mdk-gauge-chart'`        | Unique id used for the SVG's accessibility labels                                      |
| `height`          | Optional | `number \| string`            | `200`                      | Container height in pixels or a CSS value                                              |
| `className`       | Optional | `string`                      | —                          | Additional class for the root `div`                                                    |

## Example

```tsx
import { GaugeChart } from "@tetherto/mdk-react-devkit"

<GaugeChart percent={0.75} />

<GaugeChart
  percent={0.4}
  colors={["#34C759", "#FF9500", "#FF3B30"]}
  nrOfLevels={3}
  hideText
  height={150}
/>
```

## Notes

- `percent` is automatically clamped to `[0, 1]`
- When rendering multiple gauges on the same page, provide a unique `id` for each instance so their SVG accessibility labels stay distinct
- For a progress-style gauge (single fill arc, no needle) pass `arcsLength={[percent, 1 - percent]}` with two `colors` and `hideNeedle`
