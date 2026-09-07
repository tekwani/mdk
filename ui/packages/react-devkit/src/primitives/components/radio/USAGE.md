# Radio

Accessible radio buttons built on Radix UI `@radix-ui/react-radio-group`. Provides three components: `Radio` (individual item), `RadioGroup` (container), and `RadioCard` (button-style radio).

## `RadioGroup` Props

| Prop          | Status   | Type      | Default      | Description      |
| ------------- | -------- | --------- | ------------ | ---------------- |
| `orientation` | Optional | `'horizontal' \| 'vertical'` | `'vertical'` | Layout direction |
| `noGap`       | Optional | `boolean` | `false`      | Removes the default gap between radio items |
| `className`   | Optional | `string`  | —            | Additional class |

All Radix `RadioGroupPrimitive.Root` props (e.g. `defaultValue`, `value`, `onValueChange`, `disabled`) are also accepted.

## `Radio` Props

| Prop                 | Status   | Type              | Default     | Description                                    |
| -------------------- | -------- | ----------------- | ----------- | ---------------------------------------------- |
| `value`              | Required | `string`          | —           | Value associated with this option              |
| `size`               | Optional | `ComponentSize` (`'sm' \| 'md' \| 'lg'`) | `'md'`      | Size variant                                   |
| `color`              | Optional | `ComponentColor`  | `'primary'` | Color variant when checked                     |
| `radius`             | Optional | `BorderRadius`    | `'full'`    | Border radius (`'full'` for circle)            |
| `label`              | Optional | `string`          | —           | Text label rendered inside the item            |
| `children`           | Optional | `React.ReactNode` | —           | Custom content (takes precedence over `label`) |
| `indicatorClassName` | Optional | `string`          | —           | Additional class for the inner indicator dot   |

All Radix `RadioGroupPrimitive.Item` props are also accepted.

## `RadioCard` Props

Accepts the same props as `Radio`. Renders as a button-styled card suitable for time-range selectors.

Default overrides: `size='sm'`, `color='default'`, `radius='none'`.

## Example

```tsx
import { Radio, RadioCard, RadioGroup } from "@tetherto/mdk-react-devkit"

// Basic radio group
<RadioGroup defaultValue="option1" onValueChange={setValue}>
  <Radio value="option1" label="Option 1" />
  <Radio value="option2" label="Option 2" />
  <Radio value="option3" label="Option 3" disabled />
</RadioGroup>

// Horizontal radio cards (e.g. time range selector)
<RadioGroup
  value={range}
  onValueChange={setRange}
  orientation="horizontal"
  noGap
>
  <RadioCard value="1h" label="1H" />
  <RadioCard value="24h" label="24H" />
  <RadioCard value="7d" label="7D" />
</RadioGroup>
```
