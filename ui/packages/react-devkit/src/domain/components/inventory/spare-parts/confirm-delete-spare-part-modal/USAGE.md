# ConfirmDeleteSparePartModal

Confirmation modal for deleting a spare part. Warns that the action is irreversible and surfaces the
part code so the user can verify before confirming.

## When to use

Use this as the confirm step for a destructive "Delete" row action in a spare-parts inventory view.

## Props

| Prop        | Status   | Type                                   | Default | Description                                                |
| ----------- | -------- | -------------------------------------- | ------- | ---------------------------------------------------------- |
| `isOpen`    | Optional | `boolean`                              | —       | Whether the modal is open                                  |
| `onClose`   | Optional | `() => void`                           | —       | Called when the modal requests to close                    |
| `onConfirm` | Optional | `(sparePart) => Promise<void> \| void` | —       | Called with the part when the user confirms                |
| `sparePart` | Optional | `{ id: string; code: string }`         | —       | The part to delete; when omitted the modal renders nothing |
| `isLoading` | Optional | `boolean`                              | —       | Disables the action buttons while the delete is in flight  |

## Example

```tsx
import { ConfirmDeleteSparePartModal } from '@tetherto/mdk-react-devkit/domain'

<ConfirmDeleteSparePartModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  sparePart={{ id: 'sp-001', code: 'HB-A001' }}
  onConfirm={async (part) => { await api.deleteSparePart(part.id) }}
/>
```
