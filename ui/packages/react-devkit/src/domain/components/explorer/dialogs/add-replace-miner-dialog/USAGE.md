# AddReplaceMinerDialog

Modal for adding a new miner to an empty slot or swapping the existing unit with a replacement. Orchestrates the add/replace/maintenance flow.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `open` | Required | `boolean` | — | Controls dialog visibility |
| `onClose` | Required | `VoidFunction` | — | Called when the dialog should close |
| `selectedSocketToReplace` | Optional | `UnknownRecord` | — | Socket being replaced |
| `selectedEditSocket` | Optional | `UnknownRecord` | — | Socket being edited |
| `currentDialogFlow` | Optional | `string` | — | Active flow identifier |
| `isDirectToMaintenanceMode` | Optional | `boolean` | `false` | Skip add/replace and go directly to maintenance |
| `minersType` | Optional | `string` | — | Miner hardware type filter |

## Minimal example

```tsx
import { AddReplaceMinerDialog } from "@tetherto/mdk-react-devkit";

<AddReplaceMinerDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
/>
```
