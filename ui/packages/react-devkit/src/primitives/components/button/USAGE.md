# Button

Primary action button with variants, sizes, loading state, icon placement, and
full-width layout. Forwards refs and all native `<button>` attributes.

## Props

| Prop               | Status   | Type                                 | Default       | Description                                |
| ------------------ | -------- | ------------------------------------ | ------------- | ------------------------------------------ |
| `variant`          | Optional | `ButtonVariant`                      | `"secondary"` | Visual variant (`primary`, `secondary`, …) |
| `size`             | Optional | `ComponentSize`                      | —             | `"sm"`, `"md"`, `"lg"`                     |
| `loading`          | Optional | `boolean`                            | `false`       | Show spinner and disable button            |
| `disabled`         | Optional | `boolean`                            | `false`       | Disable the button                         |
| `fullWidth`        | Optional | `boolean`                            | `false`       | Stretch to fill the container              |
| `icon`             | Optional | `ReactNode`                          | —             | Icon rendered alongside `children`         |
| `iconPosition`     | Optional | `"left" \| "right"`                  | `"left"`      | Icon placement                             |
| `contentClassName` | Optional | `string`                             | —             | Class names applied to the inner wrapper   |
| `type`             | Optional | `"button" \| "submit" \| "reset"`    | `"button"`    | Native button type                         |
| …                  | —        | All other `<button>` HTML attributes | —             | Standard React props                       |

## Example

```tsx
<Button variant="primary" onClick={handleSave}>Save</Button>
<Button loading>Submitting…</Button>
```

## Data contracts

`ButtonVariant` and `ComponentSize` are exported from [`core/types`](../../types/index.ts).

## Notes

- `aria-busy` is set when `loading` is true
- When `loading` is true the inner spinner is the only child; `icon` and
  `children` are hidden.
