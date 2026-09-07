# AddUserModal

Modal form for inviting a new user to the system. Captures name, email address, and role assignment. Uses React Hook Form + Zod validation; submission is async to allow the caller to integrate with any API layer.

## Props

| Prop           | Status   | Type           | Default | Description                                                                     |
| -------------- | -------- | -------------- | ------- | ------------------------------------------------------------------------------- |
| `open`         | Required | `boolean`      | —       | Controls whether the dialog is visible                                          |
| `onClose`      | Required | `VoidFunction` | —       | Called when the user dismisses the modal (cancel or backdrop)                   |
| `roles`        | Required | `RoleOption[]` | —       | List of assignable roles rendered in the role select drop-down                  |
| `onSubmit`     | Required | `(data: { name: string; email: string; role: string }) => Promise<void>` | —       | Async handler called with validated form values on submission                   |
| `isSubmitting` | Optional | `boolean`      | `false` | Disables the submit button and shows a loading label while the parent is saving |

## Minimal example

```tsx
<AddUserModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  roles={[{ value: 'admin', label: 'Admin' }, { value: 'viewer', label: 'Viewer' }]}
  onSubmit={async (data) => {
    await api.createUser(data)
    setIsOpen(false)
  }}
/>
```

## Notes

- The form resets automatically after a successful submission
- `roles` must be populated before opening the modal — an empty list will leave the role select empty with no options
- Closing via the backdrop is disabled (`closeOnClickOutside={false}`) to prevent accidental dismissal mid-form
