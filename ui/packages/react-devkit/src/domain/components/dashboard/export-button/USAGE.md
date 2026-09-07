# ExportButton

Split-button trigger for downloading dashboard data. Left half labels the
action; right half opens a `DropdownMenu` with the available formats.
Pairs with `useDashboardExport` from `@tetherto/mdk-react-adapter`, which
serializes whatever is currently in the TanStack Query cache.

## Props

| Prop        | Status   | Type                                | Default           | Description                              |
| ----------- | -------- | ----------------------------------- | ----------------- | ---------------------------------------- |
| `onExport`  | Required | `(format: 'csv' \| 'json') => void` | —                 | Invoked with the user's selection        |
| `formats`   | Optional | `readonly ('csv' \| 'json')[]`      | `['csv', 'json']` | Restrict the menu to a subset of formats |
| `label`     | Optional | `string`                            | `'Export'`        | Trigger label                            |
| `disabled`  | Optional | `boolean`                           | `false`           | Disable the button                       |
| `className` | Optional | `string`                            | —                 | Class hook on the trigger button         |

## Example

```tsx
import { useDashboardExport } from "@tetherto/mdk-react-adapter"
import { ExportButton } from "@tetherto/mdk-react-devkit"

const { exportCsv, exportJson } = useDashboardExport()

<ExportButton
  onExport={(format) => (format === "csv" ? exportCsv() : exportJson())}
/>
```

## Notes

- The component is presentation-only. It does not decide *what* to
  serialize — the page-level handler reads from the cache (via
  `useDashboardExport`) and triggers the download
- Pass `formats={['csv']}` if you want a single-format button
