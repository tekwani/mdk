# Alert

Contextual feedback banner for success, info, warning, and error messages. Supports icons, close button, an action slot, and an optional full-width banner mode.

## Props

| Prop          | Status   | Type                                          | Default  | Description                                      |
| ------------- | -------- | --------------------------------------------- | -------- | ------------------------------------------------ |
| `type`        | Optional | `'success' \| 'info' \| 'warning' \| 'error'` | `'info'` | Controls color scheme and default icon           |
| `title`       | Optional | `React.ReactNode`                             | —        | Primary message content                          |
| `description` | Optional | `React.ReactNode`                             | —        | Secondary/detail content shown below the title   |
| `showIcon`    | Optional | `boolean`                                     | `false`  | Renders the type icon (or `icon` override) before the content |
| `icon`        | Optional | `React.ReactNode`                             | —        | Custom icon; only used when `showIcon` is `true` |
| `closable`    | Optional | `boolean`                                     | `false`  | Shows an ✕ button; clicking it hides the alert   |
| `onClose`     | Optional | `React.MouseEventHandler<HTMLButtonElement>`  | —        | Fired after the close button is clicked          |
| `banner`      | Optional | `boolean`                                     | `false`  | Renders without border radius or margin (full-width banner style) |
| `action`      | Optional | `React.ReactNode`                             | —        | Content rendered to the right of the message (e.g. a button) |
| `className`   | Optional | `string`                                      | —        | Additional class for the root `div`              |
| `style`       | Optional | `React.CSSProperties`                         | —        | Inline styles for the root `div`                 |

## Example

```tsx
import { CoreAlert } from '@tetherto/mdk-react-devkit'

<CoreAlert type="success" title="Saved successfully" showIcon />

<CoreAlert
  type="warning"
  title="Low hashrate detected"
  description="Average hashrate dropped below threshold."
  showIcon
  closable
/>

<CoreAlert
  type="error"
  title="Connection lost"
  action={<Button onClick={retry}>Retry</Button>}
/>

{/* Full-width banner */}
<CoreAlert type="info" title="Maintenance window tonight" banner />
```

## Notes

- Once closed via the ✕ button, the component returns `null` and cannot be reopened without unmounting/remounting
- Setting `description` automatically adds the `mdk-alert--with-description` modifier for extra spacing
