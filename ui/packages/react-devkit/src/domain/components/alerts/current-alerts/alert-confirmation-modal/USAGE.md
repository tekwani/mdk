# AlertConfirmationModal

Confirmation dialog that appears before acknowledging or clearing one or more alerts. Prevents accidental bulk-clear actions.

## Props

| Prop     | Status   | Type           | Default | Description                              |
| -------- | -------- | -------------- | ------- | ---------------------------------------- |
| `isOpen` | Required | `boolean`      | —       | Controls dialog visibility               |
| `onOk`   | Required | `VoidFunction` | —       | Called when the user confirms the action |

## Minimal example

```tsx
import { AlertConfirmationModal } from "@tetherto/mdk-react-devkit";

<AlertConfirmationModal
  isOpen={isOpen}
  onOk={() => { clearAlerts(); setIsOpen(false); }}
/>
```
