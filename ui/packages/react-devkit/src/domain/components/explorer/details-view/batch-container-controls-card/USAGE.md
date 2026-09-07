# BatchContainerControlsCard

Bulk-controls card for applying start/stop/mode changes to multiple selected containers at once. Reads `selectedContainers` from `devicesStore` and dispatches batch commands through `actionsStore`.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `isBatch` | Optional | `boolean` | `true` | Whether in batch (multi-select) mode |
| `isCompact` | Optional | `boolean` | — | Compact layout for tighter spaces |
| `connectedMiners` | Optional | `unknown` | — | Array of currently connected miners |
| `alarmsDataItems` | Optional | `TimelineItemData[]` | — | Alarm timeline entries to display |
| `onNavigate` | Optional | `(path: string) => void` | — | Navigation callback for alarm deep-links |

## Minimal example

```tsx
import { BatchContainerControlsCard } from "@tetherto/mdk-react-devkit";

<BatchContainerControlsCard
  isBatch={true}
  isCompact={false}
  connectedMiners={[]}
  alarmsDataItems={[]}
  onNavigate={(path) => router.push(path)}
/>
```
