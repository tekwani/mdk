# ExplorerDetail

Per-type Explorer detail panel. Reads the current selection the `useExplorerSelection` bridge writes into the shared `devicesStore` and composes the matching cards for the active tab:

- **container** — Batch Container Controls (batch when more than one is selected) with the connected-miner power-mode controls and active-alarms box, the connected-miner stats aggregate, and the per-socket Container Controls when a socket selection exists.
- **miner** — Miner Controls (write actions), read-only miner info + per-chip stats, the stats aggregate, and the active-alarms box.
- **cabinet** — read-only LV cabinet detail: powermeter + temperature readings and the LV-cabinet warnings timeline.

Write actions queue into the actions draft store; submission stays gated behind the `ActionsSidebar`.

## Props

| Prop         | Status   | Type                     | Default | Description                                                    |
| ------------ | -------- | ------------------------ | ------- | -------------------------------------------------------------- |
| `deviceType` | Required | `DeviceExplorerDeviceType` (`"container" \| "miner" \| "cabinet"`) | —       | The active Explorer tab — selects which per-type panel renders |
| `onNavigate` | Optional | `(path: string) => void` | no-op   | Router navigate used by alarm rows to deep-link into the alert |
| `isCompact`  | Optional | `boolean`                | `true`  | Compact layout for the narrower Explorer detail column         |

## Minimal example

```tsx
import { DEVICE_EXPLORER_DEVICE_TYPE, ExplorerDetail } from "@tetherto/mdk-react-devkit";
import { useNavigate } from "react-router";

const navigate = useNavigate();

<ExplorerDetail
  deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER}
  onNavigate={(path) => navigate(path)}
/>;
```

Pair it with `useExplorerSelection` (which bridges the `<DeviceExplorer>` table selection into `devicesStore`) so the panel reflects the row(s) the user selects.
