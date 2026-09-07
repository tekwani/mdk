# Checkbox

Controlled or uncontrolled checkbox built on Radix UI. Supports size, color
and border-radius variants. Indeterminate state via `checked="indeterminate"`.

## Props

| Prop                 | Status   | Type                              | Default     | Description                        |
| -------------------- | -------- | --------------------------------- | ----------- | ---------------------------------- |
| `checked`            | Optional | `boolean \| "indeterminate"`      | —           | Controlled checked state           |
| `defaultChecked`     | Optional | `boolean`                         | —           | Uncontrolled initial checked state |
| `onCheckedChange`    | Optional | `(checked: CheckedState) => void` | —           | Change handler                     |
| `size`               | Optional | `"xs" \| "sm" \| "md" \| "lg"`    | `"md"`      | Size variant                       |
| `color`              | Optional | `ComponentColor`                  | `"primary"` | Color when checked                 |
| `radius`             | Optional | `BorderRadius`                    | `"none"`    | Border radius variant              |
| `disabled`           | Optional | `boolean`                         | `false`     | Disable the input                  |
| `className`          | Optional | `string`                          | —           | Root class names                   |
| `indicatorClassName` | Optional | `string`                          | —           | Indicator (check icon) class names |

## Example

```tsx
const [checked, setChecked] = useState(false);
<Checkbox checked={checked} onCheckedChange={setChecked} />;

// Indeterminate
<Checkbox checked="indeterminate" />;
```

## Notes

- Always pair with a `<Label>` for accessibility
- Re-exports `CheckedState` from Radix for convenience
