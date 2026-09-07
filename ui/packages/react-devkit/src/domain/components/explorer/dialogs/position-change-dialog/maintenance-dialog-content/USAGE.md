# MaintenanceDialogContent

Form body inside the maintenance dialog. Captures work-order details (reason, technician, notes) before applying the maintenance flag to a miner slot.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `selectedEditSocket` | Optional | `Partial<SelectedEditSocket>` | — | The socket/slot being flagged for maintenance |
| `onCancel` | Optional | `VoidFunction` | — | Called when the user cancels |

## Minimal example

```tsx
import { MaintenanceDialogContent } from "@tetherto/mdk-react-devkit";

<MaintenanceDialogContent
  selectedEditSocket={socket}
  onCancel={() => setOpen(false)}
/>
```
