# Spinner

Loading indicator. Two animation styles (`square` and `circle`), three sizes,
optional label and a fullscreen overlay mode.

## Props

| Prop         | Status   | Type                           | Default     | Description                        |
| ------------ | -------- | ------------------------------ | ----------- | ---------------------------------- |
| `size`       | Optional | `"sm" \| "md" \| "lg"`         | `"md"`      | Size variant                       |
| `color`      | Optional | `"primary" \| "secondary"`     | `"primary"` | Color variant                      |
| `type`       | Optional | `"square" \| "circle"`         | `"square"`  | Animation style                    |
| `speed`      | Optional | `"slow" \| "normal" \| "fast"` | `"normal"`  | Animation speed                    |
| `label`      | Optional | `string`                       | —           | Caption shown below the spinner    |
| `fullScreen` | Optional | `boolean`                      | `false`     | Cover the viewport with a backdrop |
| `className`  | Optional | `string`                       | —           | Additional class names             |

All other `<div>` attributes are forwarded.

## Example

```tsx
<Spinner />
<Spinner size="lg" type="circle" label="Loading miners…" />
<Spinner fullScreen />
```

## Notes

- Uses `role="status"` and `aria-live="polite"` for screen-reader updates
- Inside `<Button loading>`, the button automatically renders its own spinner
