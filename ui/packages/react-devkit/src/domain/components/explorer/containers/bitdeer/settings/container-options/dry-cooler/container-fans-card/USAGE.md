# ContainerFansCard / ContainerFanLegend

`ContainerFansCard` renders a grid of fan status items for a container. `ContainerFanLegend` is the individual fan strip showing fan number and on/off icon.

## ContainerFansCard Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `fansData` | Optional | `{ enabled?: boolean; index: number }[]` | — | Array of fan state objects. Renders an empty card when the array is empty; returns `null` when absent. |

## ContainerFanLegend Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `index` | Optional | `number \| null` | — | Fan number displayed as a label |
| `enabled` | Optional | `boolean` | `false` | Running state; controls icon and colour class |
| `className` | Optional | `string` | — | Additional CSS class |

## Minimal example

```tsx
import { ContainerFansCard, ContainerFanLegend } from "@tetherto/mdk-react-devkit";

<ContainerFansCard fansData={[{ enabled: true, index: 0 }, { enabled: false, index: 1 }]} />
<ContainerFanLegend index={1} enabled={true} />
```
