# Cascader

A two-panel hierarchical selection component. The left panel lists categories; the right panel shows their children. Supports single and multiple selection modes and a flat search view.

## Props

| Prop                | Status   | Type               | Default       | Description                                                  |
| ------------------- | -------- | ------------------ | ------------- | ------------------------------------------------------------ |
| `options`           | Required | `CascaderOption[]` | —             | Hierarchical option tree (categories with children)          |
| `value`             | Optional | `CascaderValue[] \| CascaderValue` | —  | Current selection. Single: `CascaderValue`. Multiple: `CascaderValue[]`. |
| `onChange`          | Optional | `(value: CascaderValue[] \| CascaderValue \| null) => void` | —    | Fired when selection changes |
| `multiple`          | Optional | `boolean`          | `false`       | Enables multi-select with checkboxes                         |
| `placeholder`       | Optional | `string`           | `'Select...'` | Input placeholder text                                       |
| `disabled`          | Optional | `boolean`          | `false`       | Disables the entire component                                |
| `className`         | Optional | `string`           | —             | Additional class for the root element                        |
| `dropdownClassName` | Optional | `string`           | —             | Additional class for the dropdown panels container           |

### `CascaderOption`

| Field      | Status   | Type                          | Default | Description          |
| ---------- | -------- | ----------------------------- | ------- | -------------------- |
| `value`    | Required | `string \| number \| boolean` | —       | Unique option value  |
| `label`    | Required | `string`                      | —       | Display label        |
| `children` | Optional | `CascaderOption[]`            | —       | Child options (creates a nested category) |
| `disabled` | Optional | `boolean`                     | —       | Disables this option |

### Types

- `CascaderValue` — `(string | number | boolean)[]` — path from parent to leaf (e.g. `['electronics', 'phones']`)

## Example

```tsx
import { Cascader } from "@tetherto/mdk-react-devkit"

const options = [
  {
    value: "status",
    label: "Status",
    children: [
      { value: "active", label: "Active" },
      { value: "offline", label: "Offline" },
    ],
  },
]

// Single select
const [value, setValue] = useState<CascaderValue>(["status", "active"])

<Cascader
  options={options}
  value={value}
  onChange={(value) => setValue(value as CascaderValue)}
/>

// Multi-select
const [values, setValues] = useState<CascaderValue[]>([])

<Cascader
  options={options}
  value={values}
  onChange={(value) => setValues(value as CascaderValue[])}
  multiple
  placeholder="Filter by status..."
/>
```

## Notes

- Typing in the input switches from the two-panel view to a flat search results list
- In `multiple` mode, clicking a category header checkbox selects/deselects all its non-disabled children; partial selections show an indeterminate state
