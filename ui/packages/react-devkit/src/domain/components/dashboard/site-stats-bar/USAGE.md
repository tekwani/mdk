# SiteStatsBar

Site-level summary strip sitting at the top of a dashboard page. Composes
`WidgetTopRow` (title + current power) and `GenericDataBox` (hashrate, miner
count, container count) into one horizontal card.

## Props

| Prop             | Status   | Type      | Default  | Description                                 |
| ---------------- | -------- | --------- | -------- | ------------------------------------------- |
| `title`          | Required | `string`  | —        | Site label, rendered in the header row      |
| `power`          | Optional | `number`  | —        | Current power, expressed in `powerUnit`     |
| `powerUnit`      | Optional | `string`  | `'kW'`   | Display unit for `power`                    |
| `totalHashrate`  | Optional | `number`  | —        | Aggregate hashrate                          |
| `hashrateUnit`   | Optional | `string`  | `'TH/s'` | Display unit for `totalHashrate`            |
| `minerCount`     | Optional | `number`  | —        | Total miner count across the site           |
| `containerCount` | Optional | `number`  | —        | Total container count across the site       |
| `isLoading`      | Optional | `boolean` | `false`  | Render a skeleton bar while data is loading |
| `className`      | Optional | `string`  | —        | Class hook                                  |

## Example

```tsx
<SiteStatsBar
  title='Site A'
  power={1320}
  totalHashrate={92.3}
  minerCount={1024}
  containerCount={4}
/>
```

## Notes

- Renders `'—'` for any stat that's `undefined`. Pass `isLoading` for a
  cleaner first-paint experience
- `WidgetTopRow` reads timezone formatting via `useTimezoneFormatter`, so this
  component must live inside an `<MdkProvider>` tree
