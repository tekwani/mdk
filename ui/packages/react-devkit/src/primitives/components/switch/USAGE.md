# Switch

Toggle switch built on Radix UI. Controlled or uncontrolled.

## Props

| Prop              | Status   | Type                         | Default     | Description                |
| ----------------- | -------- | ---------------------------- | ----------- | -------------------------- |
| `checked`         | Optional | `boolean`                    | —           | Controlled checked state   |
| `defaultChecked`  | Optional | `boolean`                    | —           | Uncontrolled initial state |
| `onCheckedChange` | Optional | `(checked: boolean) => void` | —           | Change handler             |
| `size`            | Optional | `"sm" \| "md" \| "lg"`       | `"md"`      | Size variant               |
| `color`           | Optional | `ComponentColor`             | `"default"` | Color when checked         |
| `radius`          | Optional | `BorderRadius`               | `"none"`    | Border radius variant      |
| `disabled`        | Optional | `boolean`                    | `false`     | Disable the switch         |
| `className`       | Optional | `string`                     | —           | Root class names           |
| `thumbClassName`  | Optional | `string`                     | —           | Thumb (knob) class names   |

## Example

```tsx
const [enabled, setEnabled] = useState(false);

<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <Switch id="notify" checked={enabled} onCheckedChange={setEnabled} />
  <Label htmlFor="notify">Enable notifications</Label>
</div>
```

## Notes

- Pair with a `Label` (via `htmlFor` / `id`) for accessibility
- Prefer `Switch` for boolean state where the change applies immediately;
  use `Checkbox` for selections inside a form
