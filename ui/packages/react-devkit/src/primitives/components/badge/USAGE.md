# Badge

Small status indicator displayed standalone or overlaid on another element.
Renders as a number, dot, custom text, or status pill.

## Props

| Prop               | Status   | Type               | Default     | Description                                         |
| ------------------ | -------- | ------------------ | ----------- | --------------------------------------------------- |
| `children`         | Optional | `ReactNode`        | —           | Element to overlay the badge onto                   |
| `count`            | Optional | `number`           | `0`         | Number to display                                   |
| `overflowCount`    | Optional | `number`           | `99`        | Above this, renders as e.g. `99+`                   |
| `showZero`         | Optional | `boolean`          | `false`     | Render the badge when `count === 0`                 |
| `dot`              | Optional | `boolean`          | `false`     | Render as a dot instead of a number                 |
| `text`             | Optional | `string`           | —           | Custom text content (overrides `count`)             |
| `color`            | Optional | `ColorVariant`     | `"primary"` | Color variant                                       |
| `size`             | Optional | `ComponentSize`    | `"md"`      | `"sm" \| "md" \| "lg"`                              |
| `square`           | Optional | `boolean`          | `false`     | Square (no border-radius) badge                     |
| `status`           | Optional | `"success" \| "processing" \| "error" \| "warning" \| "default"` | —  | Renders a status dot with optional text             |
| `offset`           | Optional | `[number, number]` | `[0, 0]`    | Pixel offset when overlaid on `children`            |
| `className`        | Optional | `string`           | —           | Badge element class names                           |
| `wrapperClassName` | Optional | `string`           | —           | Wrapper class names (only when wrapping `children`) |
| `title`            | Optional | `string`           | —           | Accessible label                                    |

## Example

```tsx
<Badge count={5}><Button>Messages</Button></Badge>
<Badge dot><BellIcon /></Badge>
<Badge status="success" text="Online" />
<Badge count={120} overflowCount={99} />
```

## Notes

- When used without `children`, renders standalone
- `dot` and `status` ignore `count` / `text` for the visual but keep `text` as the label when `status` is set
