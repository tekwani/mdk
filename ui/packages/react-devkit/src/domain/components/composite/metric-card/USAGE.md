# MetricCard

Compact card displaying a labelled metric value with an optional unit suffix.
Supports highlighted (orange accent) and transparent-colour display states,
making it suitable for pool-performance dashboards, financial summary rows, and
inline KPI strips where visual weight needs to be controlled.

## Props

| Prop                 | Status   | Type                       | Default | Description                  |
| -------------------- | -------- | -------------------------- | ------- | ---------------------------- |
| `label`              | Required | `string`                   | —       | Text label shown above the value |
| `unit`               | Required | `string`                   | —       | Unit suffix appended after the value (e.g. `"TH/s"`, `"W"`, `"USD"`) |
| `value`              | Required | `number \| string \| null` | —       | Metric value to display |
| `bgColor`            | Optional | `string`                   | `BLACK_ALPHA_05` | Custom background color (CSS color string) |
| `className`          | Optional | `string`                   | —       | Additional class names appended to the root element |
| `noMinWidth`         | Optional | `boolean`                  | `false` | Removes the default minimum width so the card shrinks to content |
| `isHighlighted`      | Optional | `boolean`                  | `false` | Renders the value in orange to draw attention |
| `isValueMedium`      | Optional | `boolean`                  | `false` | Applies a medium-weight variant to the value typography |
| `showDashForZero`    | Optional | `boolean`                  | `false` | Displays `—` instead of `0` when value is zero |
| `isTransparentColor` | Optional | `boolean`                  | `false` | Renders the value in a low-opacity white for de-emphasized display |

## Minimal example

```tsx
<MetricCard label="Hashrate" unit="TH/s" value={102.4} />
```

## Notes

- When `value` is `null` the component renders the FALLBACK placeholder (`—`) from `@primitives`
- `showDashForZero` and `null` values both render the same FALLBACK string
- `isHighlighted` takes precedence over `isTransparentColor` for color resolution
- The background color is applied via a `--mdk-metric-card-bg` CSS custom property, allowing it to be overridden at the `@layer app` level
