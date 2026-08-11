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

### `HeaderHashrateBox`

| Prop             | Type        | Default                     | Description                                     |
| ---------------- | ----------- | --------------------------- | ----------------------------------------------- |
| `icon`           | `ReactNode` | —                           | Icon shown next to the stat                     |
| `appPhs`         | `number`    | —                           | App-side aggregate hashrate in PH/s             |
| `poolPhs`        | `number`    | —                           | Pool-side aggregate hashrate in PH/s            |
| `unit`           | `string`    | `PH/s`                      | Hashrate unit label                             |
| `fractionDigits` | `number`    | `3`                         | Decimal places shown for both values            |
| `appLabel`       | `string`    | `APP` (`WEBAPP_SHORT_NAME`) | Label for the app-side row                      |
| `className`      | `string`    | —                           | Additional class names                          |

### `HeaderMinersBox`

| Prop           | Type        | Default                     | Description                                                       |
| -------------- | ----------- | --------------------------- | ----------------------------------------------------------------- |
| `icon`         | `ReactNode` | —                           | Icon shown next to the "Miners" label                             |
| `total`        | `number`    | —                           | Total miners across the site (denominator of the ratio)           |
| `online`       | `number`    | —                           | Online miners (the numerator)                                     |
| `error`        | `number`    | —                           | Miners flagged in warning (small amber count)                     |
| `offline`      | `number`    | —                           | Miners offline (small red count)                                  |
| `appTotal`     | `number`    | —                           | Optional app-side meta line: total miners reporting to the app    |
| `poolTotal`    | `number`    | —                           | Optional pool-side meta: total miners per upstream pools          |
| `poolOnline`   | `number`    | —                           | Optional pool-side online count (green)                           |
| `poolMismatch` | `number`    | —                           | Optional pool-side mismatch count (red)                           |
| `appLabel`     | `string`    | `APP` (`WEBAPP_SHORT_NAME`) | Label for the app-side row                                        |
| `className`    | `string`    | —                           | Additional class names                                            |

## Notes

- Undefined numbers render as `—`. Loading state is the empty state.
- The icon slot on each box is optional — pass a 16/20px SVG.
- Styles use cascade layer `mdk`; consumer styles in `app` win without
  specificity tricks.
