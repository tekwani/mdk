# RBACControlSettings

Full role-based access control settings panel: user list with inline role editing, permission matrix, and invite/delete controls.

## Props

| Prop               | Status   | Type                                        | Default | Description                                       |
| ------------------ | -------- | ------------------------------------------- | ------- | ------------------------------------------------- |
| `users`            | Required | `SettingsUser[]`                            | —       | List of current users                             |
| `roles`            | Required | `RoleOption[]`                              | —       | Available role options                            |
| `rolePermissions`  | Required | `Record<string, Record<string, PermLevel>>` | —       | Permission levels per role                        |
| `permissionLabels` | Required | `Record<string, string>`                    | —       | Display labels for permission keys                |
| `canWrite`         | Required | `boolean`                                   | —       | Whether the current user may edit access settings |
| `onCreateUser`     | Required | `(data) => Promise<void>`                   | —       | Create a new user                                 |
| `onUpdateUser`     | Required | `(data) => Promise<void>`                   | —       | Update an existing user's role                    |
| `onDeleteUser`     | Required | `(userId) => Promise<void>`                 | —       | Delete a user                                     |
| `isLoading`        | Optional | `boolean`                                   | `false` | Show loading state                                |
| `className`        | Optional | `string`                                    | —       | Additional CSS class                              |

## Minimal example

```tsx
import { RBACControlSettings } from "@tetherto/mdk-react-devkit";

<RBACControlSettings
  users={users}
  roles={roles}
  rolePermissions={rolePermissions}
  permissionLabels={permissionLabels}
  canWrite={true}
  onCreateUser={handleCreate}
  onUpdateUser={handleUpdate}
  onDeleteUser={handleDelete}
/>
```
