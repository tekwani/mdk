# PoolDetailsCard

Compact key/value card for pool metadata. Empty list renders a "No data
available" placeholder.

## Props

| Prop        | Status   | Type               | Default | Description                         |
| ----------- | -------- | ------------------ | ------- | ----------------------------------- |
| `details`   | Required | `PoolDetailItem[]` | —       | Detail rows to render               |
| `label`     | Optional | `string`           | —       | Header label                        |
| `underline` | Optional | `boolean`          | `false` | Render an underline under the label |
| `className` | Optional | `string`           | —       | Additional class names              |

## Example

```tsx
<PoolDetailsCard
  label="Pool details"
  details={[
    { title: "URL", value: "stratum+tcp://..." },
    { title: "Worker", value: "rig-01" },
  ]}
/>
```

## Data contracts

`PoolDetailItem` is exported alongside the component — `{ title: string;
value?: string | number }`. Undefined values render as `-`.
