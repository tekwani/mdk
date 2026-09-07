# StatusItem

Compact labelled status pill used inside BitMain container panels for boolean or enum readings. Renders a label alongside a coloured indicator driven by the `status` value.

## Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | Optional | `string` | — | Display label for the reading (e.g. `"Circulation Pump"`) |
| `status` | Optional | `StatusType` | — | Status value that controls indicator colour (`"normal"`, `"warning"`, `"fault"`, `"unavailable"`) |

## Minimal example

```tsx
import { StatusItem } from "@tetherto/mdk-react-devkit";

<StatusItem label="Circulation Pump" status="normal" />
```
