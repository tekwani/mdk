# Heatmap

A generic grid of value-coloured cells on a low→high gradient, plus a matching
`HeatmapLegend`. Presentational and domain-agnostic — pass a row-major matrix of
cells and an optional `[min, max]` range (auto-derived otherwise).

Use `renderCell` to overlay domain content (e.g. PDU socket borders, selection,
tooltips) without forking the primitive; the grid still owns each cell's
background colour.

## Heatmap props

| Prop         | Status   | Type                       | Default            | Description                                                               |
| ------------ | -------- | -------------------------- | ------------------ | ------------------------------------------------------------------------- |
| `data`       | Required | `HeatmapCell[][]`          | —                  | Row-major matrix of cells (`{ value, label?, key? }`); rows may be ragged |
| `min`        | Optional | `number`                   | auto               | Range floor (maps to the first gradient stop)                             |
| `max`        | Optional | `number`                   | auto               | Range ceiling (maps to the last stop)                                     |
| `colors`     | Optional | `readonly string[]`        | `HEATMAP_GRADIENT` | Gradient stops low→high                                                   |
| `emptyColor` | Optional | `string`                   | `#000000`          | Colour for `null` cells                                                   |
| `showValues` | Optional | `boolean`                  | `false`            | Render each cell's value/label as text                                    |
| `renderCell` | Optional | `(cell, ctx) => ReactNode` | —                  | Override cell content; `ctx` is `{ color, row, col }`                     |
| `ariaLabel`  | Optional | `string`                   | `"Heatmap"`        | Accessible label for the grid                                             |
| `className`  | Optional | `string`                   | —                  | Additional class for the root element                                     |

## HeatmapLegend props

| Prop        | Status   | Type                | Default            | Description                           |
| ----------- | -------- | ------------------- | ------------------ | ------------------------------------- |
| `min`       | Required | `number \| string`  | —                  | Low-end value or pre-formatted label  |
| `max`       | Required | `number \| string`  | —                  | High-end value or pre-formatted label |
| `unit`      | Optional | `string`            | —                  | Unit suffix appended to `min`/`max`   |
| `label`     | Optional | `string`            | —                  | Heading above the gradient bar        |
| `colors`    | Optional | `readonly string[]` | `HEATMAP_GRADIENT` | Gradient stops low→high               |
| `className` | Optional | `string`            | —                  | Additional class for the root element |

## Example

```tsx
import { Heatmap, HeatmapLegend } from "@tetherto/mdk-react-devkit"

<Heatmap
  data={[
    [{ value: 20 }, { value: 45 }],
    [{ value: 70 }, { value: null }],
  ]}
  showValues
/>
<HeatmapLegend label="Temperature" min={20} max={85} unit="°C" />
```

## Notes

- The colour scale is exported as `getHeatmapColor(value, min, max, stops?)` and
  the default palette as `HEATMAP_GRADIENT` (cold→hot: blue → green → yellow →
  red) from `@tetherto/mdk-react-devkit`.
- `null` values render `emptyColor` and no text
- Values outside `[min, max]` are clamped to the end stops
