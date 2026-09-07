# Toast / Toaster

Transient notifications shown in a corner of the viewport, built on Radix UI.
The simplest path is `<Toaster>` (Provider + Viewport in one) wrapping a
list of `<Toast>` elements.

## `Toaster` props

| Prop       | Status   | Type        | Default      | Description                      |
| ---------- | -------- | ----------- | ------------ | -------------------------------- |
| `children` | Required | `ReactNode` | —            | The `<Toast>` elements to render |
| `position` | Optional | `"top-left" \| "top-center" \| "top-right" \| "bottom-left" \| "bottom-center" \| "bottom-right"` | `"top-left"` | Where the viewport is anchored   |

All other `ToastProvider` props are forwarded.

## `Toast` props

| Prop           | Status   | Type                      | Default  | Description                         |
| -------------- | -------- | ------------------------- | -------- | ----------------------------------- |
| `title`        | Required | `string`                  | —        | Title shown at the top of the toast |
| `description`  | Optional | `string`                  | —        | Body text                           |
| `variant`      | Optional | `"success" \| "error" \| "warning" \| "info"` | `"info"` | Determines the icon and accent      |
| `icon`         | Optional | `JSX.Element`             | —        | Override the default variant icon   |
| `open`         | Optional | `boolean`                 | —        | Controlled open state               |
| `onOpenChange` | Optional | `(open: boolean) => void` | —        | Open-state change handler           |
| `duration`     | Optional | `number`                  | —        | Auto-dismiss after N ms             |

## Example

```tsx
<Toaster position="bottom-right">
  <Toast title="Saved" description="Your changes were saved." variant="success" />
</Toaster>
```

In practice, render toasts from state managed by `useNotification`:

```tsx
const { notifications } = useNotification();

<Toaster position="bottom-right">
  {notifications.map((n) => (
    <Toast key={n.id} title={n.title} description={n.description} variant={n.variant} />
  ))}
</Toaster>;
```

## Notes

- The compound parts (`ToastProvider`, `ToastViewport`) are available for
  fine-grained control; most code should stick to `<Toaster>`
- Place exactly one `<Toaster>` in your app root
