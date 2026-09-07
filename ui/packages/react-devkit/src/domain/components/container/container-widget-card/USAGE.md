# ContainerWidgetCard

Presentational summary card for a single container in the Site Overview widgets
grid. Renders a header row (title / alarm badges / power), then either an
offline / error banner or the body: an optional vendor-specific content slot, a
miners summary, and a miner-activity chart.

Fully props-driven — no data fetching, formatting, or alarm math. The owning
feature/hook shapes every value (including `flash` and the pre-formatted
`summary` rows).

## Props

| Prop                | Status   | Type                                     | Default | Description                                                      |
| ------------------- | -------- | ---------------------------------------- | ------- | ---------------------------------------------------------------- |
| `title`             | Required | `string`                                 | —       | Container display name                                           |
| `summary`           | Required | `MinersSummaryParam[]`                   | —       | Pre-formatted label/value rows                                   |
| `power`             | Optional | `number`                                 | —       | Latest power draw in watts (rendered in kW)                      |
| `powerUnit`         | Optional | `string`                                 | —       | Power unit label                                                 |
| `alarms`            | Optional | `WidgetTopRowProps["alarms"]`            | —       | Per-category alarm badges                                        |
| `statsErrorMessage` | Optional | `string \| ErrorWithTimestamp[] \| null` | —       | Raw stats error shown as a tooltip in place of the power reading |
| `activity`          | Optional | `ContainerActivityData`                  | `{}`    | Miner-state counts for the activity chart                        |
| `isActivityLoading` | Optional | `boolean`                                | `false` | Activity chart loading state                                     |
| `isActivityError`   | Optional | `boolean`                                | `false` | Activity chart error state                                       |
| `activityError`     | Optional | `ContainerActivityError`                 | `null`  | Activity chart error payload                                     |
| `isOffline`         | Optional | `boolean`                                | `false` | Render the offline banner instead of the body                    |
| `errorMessage`      | Optional | `string`                                 | —       | Render an error banner instead of the body                       |
| `flash`             | Optional | `boolean`                                | `false` | Critical-high alarm flash (computed upstream)                    |
| `vendorContent`     | Optional | `ReactNode`                              | —       | Vendor-specific boxes rendered above the summary                 |
| `onClick`           | Optional | `() => void`                             | —       | Card click handler (navigation is the caller's concern)          |
| `className`         | Optional | `string`                                 | —       | Additional class for the root element                            |

## Example

```tsx
import { ContainerWidgetCard } from "@tetherto/mdk-react-devkit"

<ContainerWidgetCard
  title="Container A"
  power={412_000}
  powerUnit="kW"
  summary={[
    { label: "Hash Rate", value: "1.24 PH/s" },
    { label: "Max Temp", value: "72 °C" },
    { label: "Avg Temp", value: "65 °C" },
  ]}
  activity={{ total: 210, online: 200, offline: 10 }}
/>
```

## Notes

- `flash` and `summary` are derived by the container-widgets data hook — the card
  never computes alarm state or formats values itself
- Use `vendorContent` to slot in per-model boxes (`SupplyLiquidBox`, `TanksBox`,
  `MicroBTWidgetBox`, `BitmainImmersionSummaryBox`) without adding model
  branching to the generic card
