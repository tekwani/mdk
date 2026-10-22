# `DashboardDateRangePicker`

Dashboard wrapper around the core `DateRangePicker`. It speaks
`{ start, end }` epoch-millisecond timestamps, so a page can pass the range
straight to its history queries without any `Date <-> number` plumbing.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onChange` | Required | `(next: DashboardDateRange) => void` | - | Fires with the next `{ start, end }` window when the user applies a range |
| `value` | Required | `DashboardDateRange` | - | Current range as `{ start, end }` epoch-millisecond timestamps |
| `className` | Optional | `string` | - | Optional class hook |
| `dateFormat` | Optional | `string` | `"dd/MM/yyyy"` | Display format. Defaults to `dd/MM/yyyy` |
| `disabled` | Optional | `boolean` | `false` | Disable the trigger |

### `DashboardDateRange`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `end` | Required | `number` | - | Window end, milliseconds since epoch |
| `start` | Required | `number` | - | Window start, milliseconds since epoch |
<!-- END GENERATED: props -->

## Example

```tsx
import { useState } from "react"
import { DashboardDateRangePicker } from "@tetherto/mdk-react-devkit"

const [range, setRange] = useState({ start: Date.now() - DAY_MS, end: Date.now() })

<DashboardDateRangePicker value={range} onChange={setRange} />
```

## Notes

- The wrapper ignores partial selections — `onChange` only fires once the
  user has picked both `from` and `to` and clicked **Apply Range** in the
  core picker
- The popover, presets, and styling all come from the core
  `DateRangePicker`. This wrapper exists only to adapt the value shape
