# DatePicker & DateRangePicker

Single-date and range-date pickers built on `react-day-picker`. The range
picker includes presets and a modal-style popover with Clear / Apply actions.

## `DatePicker` props

| Prop                | Status   | Type                    | Default         | Description                       |
| ------------------- | -------- | ----------------------- | --------------- | --------------------------------- |
| `selected`          | Optional | `Date`                  | —               | Selected date                     |
| `onSelect`          | Optional | `(date?: Date) => void` | —               | Setter                            |
| `placeholder`       | Optional | `string`                | `"Pick a date"` | Trigger button placeholder        |
| `dateFormat`        | Optional | `string`                | `"MM/dd/yyyy"`  | `date-fns` format string          |
| `disabled`          | Optional | `boolean`               | `false`         | Disable the trigger               |
| `triggerClassName`  | Optional | `string`                | —               | Class names on the trigger button |
| `calendarClassName` | Optional | `string`                | —               | Class names on the day-picker     |

## `DateRangePicker` props

Adds `showPresets`, `presets: PresetItem[]`, `allowFutureDates`, and
`modalClassName`. `selected` / `onSelect` use `DateRange`.

## Example

```tsx
<DatePicker selected={date} onSelect={setDate} />
<DateRangePicker selected={range} onSelect={setRange} showPresets />
```

## Data contracts

```ts
type DateRange = { from: Date | undefined; to?: Date | undefined };
type PresetItem = { label: string; value: DateRange };
```
