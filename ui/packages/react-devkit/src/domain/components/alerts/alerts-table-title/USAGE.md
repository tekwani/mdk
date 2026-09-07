# AlertsTableTitle

Title strip for an alerts table section with a heading and an optional count badge.

## Props

| Prop        | Status   | Type        | Default | Description                      |
| ----------- | -------- | ----------- | ------- | -------------------------------- |
| `title`     | Required | `ReactNode` | —       | Section heading                  |
| `subtitle`  | Optional | `ReactNode` | —       | Optional subtitle or count badge |
| `className` | Optional | `string`    | —       | Additional CSS class             |

## Minimal example

```tsx
import { AlertsTableTitle } from "@tetherto/mdk-react-devkit";

<AlertsTableTitle title="Active Alerts" subtitle="12 total" />
```
