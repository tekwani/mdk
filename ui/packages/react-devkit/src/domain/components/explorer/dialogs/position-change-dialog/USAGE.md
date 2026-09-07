# Position-Change Dialog Components

Multi-step dialog flow for moving a miner between rack slots or performing maintenance. Composed of a top-level orchestrator and three swappable content panels.

| Component | Description |
|---|---|
| `PositionChangeDialog` | Top-level multi-step dialog orchestrating the slot-change flow |
| `ContainerSelectionDialog` | Step for picking a target container |
| `RemoveMinerDialog` | Confirmation step for removing a miner from its current slot |
| `MaintenanceDialogContent` | Form for capturing work-order details before applying the maintenance flag |

## PositionChangeDialog Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `open` | Required | `boolean` | — | Controls dialog visibility |
| `onClose` | Required | `(flow, isDontReset?) => void` | — | Called when dialog closes |
| `selectedSocketToReplace` | Optional | `UnknownRecord` | — | Socket being replaced |
| `selectedEditSocket` | Optional | `UnknownRecord` | — | Socket being edited |
| `onChangePositionClicked` | Optional | `VoidFunction` | — | Callback when position change is triggered |
| `onPositionChangedSuccess` | Optional | `VoidFunction` | — | Callback on successful position change |
| `isContainerEmpty` | Optional | `boolean` | `false` | Whether the target container slot is empty |
| `dialogFlow` | Optional | `string` | — | Initial dialog step/flow identifier |

## Minimal example

```tsx
import { PositionChangeDialog } from "@tetherto/mdk-react-devkit";

<PositionChangeDialog
  open={isOpen}
  onClose={(flow) => setIsOpen(false)}
/>
```
