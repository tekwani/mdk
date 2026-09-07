# SingleStatCard

Prominent stat tile for displaying a single key metric. Supports flash animations and four visual variants.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | Optional | `string` | — | Metric label |
| `subtitle` | Optional | `string` | `''` | Optional subtitle text |
| `value` | Optional | `number \| string \| null` | `null` | Metric value |
| `unit` | Optional | `string` | `''` | Unit of measurement (e.g. `"TH/s"`, `"W"`) |
| `color` | Optional | `string` | `'inherit'` | Accent color for the border or flash effect |
| `flash` | Optional | `boolean` | `false` | Enable flash animation on value change |
| `superflash` | Optional | `boolean` | `false` | Faster flash animation |
| `variant` | Optional | `"primary" \| "secondary" \| "tertiary" \| "highlighted"` | `"primary"` | Visual style variant |
| `row` | Optional | `boolean` | `false` | Use row layout instead of column |

## Minimal example

```tsx
import { SingleStatCard } from "@tetherto/mdk-react-devkit";

<SingleStatCard name="Hashrate" value={95.5} unit="TH/s" variant="primary" />
```
