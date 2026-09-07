# PoolDetailsPopover

Trigger button + modal dialog revealing a `PoolDetailsCard`.

## Props

| Prop           | Status   | Type               | Default | Description             |
| -------------- | -------- | ------------------ | ------- | ----------------------- |
| `details`      | Required | `PoolDetailItem[]` | —       | Detail rows             |
| `triggerLabel` | Optional | `string`           | —       | Trigger button label    |
| `title`        | Optional | `string`           | —       | Dialog title            |
| `description`  | Optional | `string`           | —       | Dialog body description |
| `disabled`     | Optional | `boolean`          | `false` | Disable the trigger     |
| `className`    | Optional | `string`           | —       | Additional class names  |

## Example

```tsx
<PoolDetailsPopover triggerLabel="View pool" title="Pool details" details={details} />
```

## Notes

- Uses MDK's `Dialog`; no portal wiring needed
