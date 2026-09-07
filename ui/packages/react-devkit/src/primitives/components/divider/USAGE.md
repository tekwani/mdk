# Divider

A styled horizontal or vertical separator line, optionally containing a label. Wraps Radix UI `@radix-ui/react-separator`.

## Props

| Prop          | Status   | Type                            | Default        | Description                                                        |
| ------------- | -------- | ------------------------------- | -------------- | ------------------------------------------------------------------ |
| `orientation` | Optional | `'horizontal' \| 'vertical'`    | `'horizontal'` | Line direction                                                     |
| `dashed`      | Optional | `boolean`                       | `false`        | Renders a dashed line                                              |
| `dotted`      | Optional | `boolean`                       | `false`        | Renders a dotted line (takes precedence over `dashed`)             |
| `children`    | Optional | `React.ReactNode`               | —              | Label content rendered in the middle of the line (horizontal only) |
| `align`       | Optional | `'left' \| 'center' \| 'right'` | `'center'`     | Horizontal alignment of the label                                  |
| `plain`       | Optional | `boolean`                       | `false`        | Renders the label without a surrounding border                     |
| `className`   | Optional | `string`                        | —              | Additional class for the root element                              |

## Example

```tsx
import { Divider } from "@tetherto/mdk-react-devkit"

// Plain horizontal line
<Divider />

// With label
<Divider align="left">Section title</Divider>

// Dashed vertical
<Divider orientation="vertical" dashed />

// Dotted with centered label
<Divider dotted>or</Divider>
```

## Notes

- Labels are ignored on vertical dividers
- `dotted` takes precedence over `dashed` when both are set
