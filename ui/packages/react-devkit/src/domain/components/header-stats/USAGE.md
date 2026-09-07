# HeaderStats

Dashboard header stat boxes: `HeaderStatsBar` (container) plus four
slot-fillers — `HeaderMinersBox`, `HeaderHashrateBox`,
`HeaderConsumptionBox`, `HeaderEfficiencyBox`. Each box is a pure
presentational component: pass numeric props, get the formatted display.
No internal data fetching — pair with `useSiteHashrate`,
`useSiteConsumption`, `useSiteEfficiency`, `useSiteMinerCounts` from
`@tetherto/mdk-react-adapter`.

## Composition

```tsx
import {
  AppHeader,
  HeaderStatsBar,
  HeaderMinersBox,
  HeaderHashrateBox,
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
} from '@tetherto/mdk-react-devkit'

import {
  useSiteConsumption,
  useSiteEfficiency,
  useSiteHashrate,
  useSiteMinerCounts,
} from '@tetherto/mdk-react-adapter'

const Header = () => {
  const counts = useSiteMinerCounts()
  const hashrate = useSiteHashrate({ timeline: '5m' })
  const consumption = useSiteConsumption({ timeline: '5m' })
  const efficiency = useSiteEfficiency({ timeline: '5m' })

  return (
    <AppHeader>
      <HeaderStatsBar>
        <HeaderMinersBox
          total={counts.data?.total}
          online={counts.data?.online}
          error={counts.data?.error}
          offline={counts.data?.offline}
        />
        <HeaderHashrateBox appPhs={hashrate.valuePhs} />
        <HeaderConsumptionBox valueMw={consumption.valueMw} />
        <HeaderEfficiencyBox valueWthS={efficiency.valueWthS} />
      </HeaderStatsBar>
    </AppHeader>
  )
}
```

## Props

### `HeaderStatsBar`

| Prop        | Status   | Type        | Default | Description |
| ----------- | -------- | ----------- | ------- | ----------- |
| `children`  | Required | `ReactNode` | —       | Stat boxes to render, left-to-right |
| `className` | Optional | `string`    | —       | Class hook  |

### `HeaderMinersBox`

| Prop           | Status   | Type        | Default | Description                                             |
| -------------- | -------- | ----------- | ------- | ------------------------------------------------------- |
| `icon`         | Optional | `ReactNode` | —       | Icon shown next to the "Miners" label                   |
| `total`        | Optional | `number`    | —       | Total miners across the site (denominator of the ratio) |
| `online`       | Optional | `number`    | —       | Online miners (the numerator)                           |
| `error`        | Optional | `number`    | —       | Miners flagged in warning (small amber count)           |
| `offline`      | Optional | `number`    | —       | Miners offline (small red count)                        |
| `appTotal`     | Optional | `number`    | —       | App-side meta line: total miners reporting to the app   |
| `poolTotal`    | Optional | `number`    | —       | Pool-side meta: total miners per upstream pools         |
| `poolOnline`   | Optional | `number`    | —       | Pool-side online count (green)                          |
| `poolMismatch` | Optional | `number`    | —       | Pool-side mismatch count (red)                          |
| `appLabel`     | Optional | `string`    | `APP` (`WEBAPP_SHORT_NAME`) | Label for the app-side row                              |
| `className`    | Optional | `string`    | —       | Additional class names                                  |

### `HeaderHashrateBox`

| Prop             | Status   | Type        | Default | Description                          |
| ---------------- | -------- | ----------- | ------- | ------------------------------------ |
| `icon`           | Optional | `ReactNode` | —       | Icon shown next to the stat          |
| `appPhs`         | Optional | `number`    | —       | App-side aggregate hashrate in PH/s  |
| `poolPhs`        | Optional | `number`    | —       | Pool-side aggregate hashrate in PH/s |
| `unit`           | Optional | `string`    | `PH/s`  | Hashrate unit label                  |
| `fractionDigits` | Optional | `number`    | `3`     | Decimal places shown for both values |
| `appLabel`       | Optional | `string`    | `APP` (`WEBAPP_SHORT_NAME`) | Label for the app-side row           |
| `className`      | Optional | `string`    | —       | Additional class names               |

### `HeaderConsumptionBox`

| Prop        | Status   | Type        | Default | Description                 |
| ----------- | -------- | ----------- | ------- | --------------------------- |
| `icon`      | Optional | `ReactNode` | —       | Icon shown next to the stat |
| `valueMw`   | Optional | `number`    | —       | Current site-level power consumption, in megawatts |
| `unit`      | Optional | `string`    | `MW`    | Unit label                  |
| `className` | Optional | `string`    | —       | Additional class names      |

### `HeaderEfficiencyBox`

| Prop        | Status   | Type        | Default  | Description                  |
| ----------- | -------- | ----------- | -------- | ---------------------------- |
| `icon`      | Optional | `ReactNode` | —        | Icon shown next to the stat  |
| `valueWthS` | Optional | `number`    | —        | Efficiency in watts per TH/s |
| `unit`      | Optional | `string`    | `W/TH/S` | Unit label                   |
| `className` | Optional | `string`    | —        | Additional class names       |

## Notes

- Undefined numbers render as `—`. Loading state is the empty state
- The icon slot on each box is optional — pass a 16/20px SVG
- Styles use cascade layer `mdk`; consumer styles in `app` win without
  specificity tricks
