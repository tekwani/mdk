# ManageUserModal

Modal for editing an existing user's name, email, and role. Shows a role-permission matrix for context.

## Props

| Prop               | Status   | Type                      | Default | Description                        |
| ------------------ | -------- | ------------------------- | ------- | ---------------------------------- |
| `open`             | Required | `boolean`                 | —       | Controls dialog visibility         |
| `onClose`          | Required | `VoidFunction`            | —       | Called when the dialog closes      |
| `user`             | Required | `SettingsUser`            | —       | The user being edited              |
| `roles`            | Required | `RoleOption[]`            | —       | Available role options             |
| `rolePermissions`  | Required | `Record<string, Record<string, PermLevel>>` | —       | Permission levels per role         |
| `permissionLabels` | Required | `Record<string, string>`  | —       | Display labels for permission keys |
| `onSubmit`         | Required | `(data) => Promise<void>` | —       | Save handler                       |
| `isSubmitting`     | Optional | `boolean`                 | `false` | Show loading on submit button      |

## Minimal example

```tsx
import { ManageUserModal } from "@tetherto/mdk-react-devkit";

<ManageUserModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  user={selectedUser}
  roles={roles}
  rolePermissions={rolePermissions}
  permissionLabels={permissionLabels}
  onSubmit={handleUpdate}
/>
```
