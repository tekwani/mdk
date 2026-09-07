# BitMainImmersionControlBox

Generic layout box used inside BitMain immersion container panels. Provides a two-column main area (left + right) and an optional bottom row.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | Optional | `string` | — | Box heading |
| `leftContent` | Optional | `ReactNode` | — | Content for the left column |
| `rightContent` | Optional | `ReactNode` | — | Content for the right column |
| `bottomContent` | Optional | `ReactNode` | — | Content for the bottom row |
| `secondary` | Optional | `boolean` | `false` | Render without border (secondary style) |
| `className` | Optional | `string` | — | Additional CSS class |

## Minimal example

```tsx
import { BitMainImmersionControlBox } from "@tetherto/mdk-react-devkit";

<BitMainImmersionControlBox
  title="Pump Station"
  leftContent={<span>Pump 1</span>}
  rightContent={<span>Pump 2</span>}
/>
```
