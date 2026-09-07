# WidgetTopRow

Compact header row used at the top of container / miner widgets — title,
per-category alarm badges, and the current power reading (or an error tooltip).

## Props

| Prop                | Status   | Type                                             | Default | Description                           |
| ------------------- | -------- | ------------------------------------------------ | ------- | ------------------------------------- |
| `title`             | Required | `string`                                         | —       | Widget title                          |
| `power`             | Optional | `number`                                         | —       | Power reading; rendered in kilo-units |
| `unit`              | Optional | `string`                                         | —       | Power unit (e.g. `"kW"`)              |
| `statsErrorMessage` | Optional | `string \| ErrorWithTimestamp[] \| null`         | —       | Error tooltip content; replaces power |
| `alarms`            | Optional | `Partial<Record<AlarmPropKey, AlarmInfoItem[]>>` | —       | Per-category alarm badges             |
| `className`         | Optional | `string`                                         | —       | Additional class names                |

## Example

```tsx
<WidgetTopRow title="Container 03" power={31500} unit="kW" alarms={alarms} />
```

## Notes

- Uses `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap in
  `<MdkProvider>`
