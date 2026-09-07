# ErrorCard

Displays one or more error messages in a card or inline style. Multi-line messages are supported using `\n` separators.

## Props

| Prop        | Status   | Type                 | Default    | Description                                                     |
| ----------- | -------- | -------------------- | ---------- | --------------------------------------------------------------- |
| `error`     | Required | `string`             | —          | Error message string. Use `\n` to split into multiple lines.    |
| `title`     | Optional | `string`             | `'Errors'` | Heading displayed above the error text                          |
| `variant`   | Optional | `'card' \| 'inline'` | `'card'`   | `'card'` shows a bordered container; `'inline'` shows flat text |
| `className` | Optional | `string`             | —          | Additional class for the root element                           |

## Example

```tsx
import { ErrorCard } from "@tetherto/mdk-react-devkit"

<ErrorCard error="Connection timed out" />

<ErrorCard
  title="Validation Errors"
  error={"Field 'name' is required\nField 'email' must be valid"}
  variant="inline"
/>
```
