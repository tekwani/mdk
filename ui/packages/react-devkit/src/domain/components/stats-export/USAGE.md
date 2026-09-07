# StatsExport

Dropdown button that triggers asynchronous CSV or JSON export. Shows a spinner
while the corresponding handler is awaited.

## Props

| Prop           | Status   | Type                  | Default | Description                          |
| -------------- | -------- | --------------------- | ------- | ------------------------------------ |
| `onCsvExport`  | Required | `() => Promise<void>` | —       | Awaited; spinner shown while pending |
| `onJsonExport` | Required | `() => Promise<void>` | —       | Awaited; spinner shown while pending |
| `hideLabel`    | Optional | `boolean`             | `false` | Hides the textual "Export" label     |
| `disabled`     | Optional | `boolean`             | `false` | Disable the trigger                  |

## Example

```tsx
<StatsExport onCsvExport={exportCsv} onJsonExport={exportJson} />
```
