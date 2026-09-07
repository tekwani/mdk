# ContainerSelectionDialog

Modal step that lists containers for the operator to choose from as part of a position-change or batch-action flow.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `miner` | Optional | `Device` | — | The miner being moved |
| `containers` | Optional | `Device[]` | `[]` | Available target containers |
| `isLoading` | Optional | `boolean` | — | Show loading spinner |
| `open` | Required | `boolean` | — | Controls visibility |
| `onClose` | Required | `(value?: boolean) => void` | — | Called when dialog closes |

## Minimal example

```tsx
import { ContainerSelectionDialog } from "@tetherto/mdk-react-devkit";

<ContainerSelectionDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  containers={availableContainers}
/>
```
