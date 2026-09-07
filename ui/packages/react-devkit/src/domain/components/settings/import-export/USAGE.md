# ImportExportSettings

Settings panel for exporting the site configuration as a JSON snapshot and importing a previously saved one. Handles file parsing internally.

## Props

| Prop          | Status   | Type                                          | Default | Description                  |
| ------------- | -------- | --------------------------------------------- | ------- | ---------------------------- |
| `onExport`    | Required | `VoidFunction`                                | —       | Trigger configuration export |
| `onImport`    | Required | `(data: SettingsExportData) => void`          | —       | Apply imported configuration |
| `onParseFile` | Optional | `(file: File) => Promise<SettingsExportData>` | —       | Custom file-parsing function |
| `isExporting` | Optional | `boolean`                                     | `false` | Show export loading state    |
| `isImporting` | Optional | `boolean`                                     | `false` | Show import loading state    |
| `className`   | Optional | `string`                                      | —       | Additional CSS class         |

## Minimal example

```tsx
import { ImportExportSettings } from "@tetherto/mdk-react-devkit";

<ImportExportSettings
  onExport={() => downloadConfig()}
  onImport={(data) => applyConfig(data)}
/>
```
