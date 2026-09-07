# RemoveMinerDialog

Confirmation modal for removing a miner from its slot. Renders nothing when `isRemoveMinerFlow` is `false`.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `headDevice` | Optional | `Device` | `{}` | The miner being removed |
| `isRemoveMinerFlow` | Required | `boolean` | — | Controls whether the dialog is open; `false` renders nothing |
| `onCancel` | Required | `VoidFunction` | — | Called when the action is cancelled |

## Minimal example

```tsx
import { RemoveMinerDialog } from "@tetherto/mdk-react-devkit";

<RemoveMinerDialog
  isRemoveMinerFlow={true}
  onCancel={() => setOpen(false)}
  headDevice={device}
/>
```
