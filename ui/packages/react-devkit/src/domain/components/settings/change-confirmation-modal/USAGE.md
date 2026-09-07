# ChangeConfirmationModal

Generic confirmation dialog that presents a summary of pending changes before applying them. Supports both standard (primary) and destructive (danger) confirmation actions. The body content is passed as `children`, making it flexible enough to render diffs, item lists, or plain text.

## Props

| Prop          | Status   | Type           | Default     | Description                                               |
| ------------- | -------- | -------------- | ----------- | --------------------------------------------------------- |
| `open`        | Required | `boolean`      | —           | Controls whether the dialog is visible                    |
| `title`       | Required | `string`       | —           | Dialog header title                                       |
| `onConfirm`   | Required | `VoidFunction` | —           | Called when the user clicks the confirm button            |
| `onClose`     | Required | `VoidFunction` | —           | Called when the user cancels or dismisses the dialog      |
| `children`    | Required | `ReactNode`    | —           | Body content — use to describe the change being confirmed |
| `confirmText` | Optional | `string`       | `"Confirm"` | Label for the confirm button                              |
| `destructive` | Optional | `boolean`      | `false`     | When `true`, the confirm button uses the danger variant   |

## Minimal example

```tsx
<ChangeConfirmationModal
  open={isOpen}
  title="Delete Site Configuration?"
  onConfirm={handleDelete}
  onClose={() => setIsOpen(false)}
  confirmText="Delete"
  destructive
>
  This will permanently remove the site and all associated pool assignments.
</ChangeConfirmationModal>
```

## Notes

- Closing via the backdrop is disabled to prevent accidental dismissal
- Use `destructive={true}` any time the action is irreversible (delete, reset, revoke)
- For non-destructive confirmations such as applying setting changes, omit `destructive` or set it to `false`
