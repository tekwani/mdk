# MiningPoolsPanel

Dashboard panel listing the site's mining pools — one row per
`minerpool-<poolType>-shelf-<index>` — with 24h BTC revenue, hashrate,
and an optional "Show details" popover.

Pair with `usePoolRows` from `@tetherto/mdk-react-adapter`; the hook
fans out the underlying `minerpoolStatsQuery` and returns rows
pre-shaped for this component.

## Props

| Prop            | Status   | Type                           | Default                 | Description                                  |
| --------------- | -------- | ------------------------------ | ----------------------- | -------------------------------------------- |
| `rows`          | Optional | `MiningPoolRow[]`              | `[]`                    | Pool rows in display order                   |
| `isLoading`     | Optional | `boolean`                      | `false`                 | Renders skeleton rows                        |
| `skeletonRows`  | Optional | `number`                       | `3`                     | Skeleton row count while `isLoading` is true |
| `label`         | Optional | `string`                       | `"Mining Pools"`        | Override the card title                      |
| `hideHeader`    | Optional | `boolean`                      | `false`                 | Hide the title row entirely                  |
| `emptyMessage`  | Optional | `string`                       | `"No pools configured"` | Message shown when `rows` is empty           |
| `onShowDetails` | Optional | `(row: MiningPoolRow) => void` | —                       | Click handler for the per-row details button |
| `className`     | Optional | `string`                       | —                       | Extra className on the root element          |

## Minimal example

```tsx
import { MiningPoolsPanel } from "@tetherto/mdk-react-devkit";
import { usePoolRows } from "@tetherto/mdk-react-adapter";

export const PoolsSection = () => {
  const { rows, isLoading } = usePoolRows();
  return <MiningPoolsPanel rows={rows} isLoading={isLoading} />;
};
```

## Data contract

```ts
type MiningPoolRow = {
  id: string;             // stable react key
  name: string;           // e.g. "minerpool-f2pool-shelf-0"
  revenue24hBtc?: number; // formatted as "0.0231 BTC" / "0 BTC"
  hashratePhs?: number;   // PH/s; rendered as TH/s when < 1 PH/s
  details?: PoolDetailItem[]; // optional — drives the "Show details" popover
};
```

## Notes

- The "Show details" button is only rendered when `row.details` is non-empty
- Default popover layout uses the shared `<PoolDetailsCard>` primitive — the
  same one consumed by `<HeaderActions>`'s pool dropdown
