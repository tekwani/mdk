# Select

Compound Radix-based select with `Select`, `SelectTrigger`, `SelectContent`,
`SelectItem`, `SelectValue`, and `SelectGroup` pieces.

## `Select` props

| Prop            | Status   | Type                  | Default | Description                |
| --------------- | -------- | --------------------- | ------- | -------------------------- |
| `value`         | Optional | `string`              | —       | Controlled value           |
| `defaultValue`  | Optional | `string`              | —       | Uncontrolled initial value |
| `onValueChange` | Optional | `(v: string) => void` | —       | Setter for the value       |
| `allowClear`    | Optional | `boolean`             | `false` | Show a clear (X) button when a value is set |

`SelectTrigger` accepts `size` (`"sm" \| "md" \| "lg"`) and `variant`
(`"default" \| "colored"`).

## Example

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select a container" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="cont-A">Container A</SelectItem>
    <SelectItem value="cont-B">Container B</SelectItem>
  </SelectContent>
</Select>
```
