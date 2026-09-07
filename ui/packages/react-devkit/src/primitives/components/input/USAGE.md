# Input

Text input with label support, prefix/suffix slots, sizes, error state, and
a search-icon variant.

## Props

| Prop               | Status   | Type                      | Default        | Description                            |
| ------------------ | -------- | ------------------------- | -------------- | -------------------------------------- |
| `label`            | Optional | `string`                  | —              | Label rendered above the input         |
| `id`               | Optional | `string`                  | auto-generated | Required when using `label` for a11y   |
| `variant`          | Optional | `"default" \| "search"`   | `"default"`    | `search` shows a magnifying glass icon |
| `size`             | Optional | `"default" \| "medium"`   | `"default"`    | Size token                             |
| `error`            | Optional | `string`                  | —              | Validation error message (red border)  |
| `prefix`           | Optional | `ReactNode`               | —              | Element before the input               |
| `suffix`           | Optional | `ReactNode`               | —              | Element after the input                |
| `wrapperClassName` | Optional | `string`                  | —              | Class names on the root wrapper        |
| …                  | —        | All other `<input>` attrs | —              | Standard React props                   |

## Example

```tsx
<Input label="MAC Address" placeholder="Enter MAC address" id="mac" />
<Input variant="search" placeholder="Search" />
<Input prefix="$" suffix="USD" placeholder="0.00" />
```
