# SecondaryStatCard

Compact stat tile rendered alongside a primary stat to provide supporting context. Displays a `name` label and a `value` in a card format.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | Optional | `string` | `''` | Stat label (e.g. `"Efficiency"`) |
| `value` | Optional | `string \| number` | `''` | Stat value to display |
| `className` | Optional | `string` | — | Additional CSS class name |

## Minimal example

```tsx
import { SecondaryStatCard } from "@tetherto/mdk-react-devkit";

<SecondaryStatCard name="Efficiency" value="92%" />
```
