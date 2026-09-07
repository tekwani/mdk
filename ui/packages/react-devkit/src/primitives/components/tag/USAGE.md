# Tag

A small inline label used to display categories, statuses, or metadata. Renders as a `<span>` with a color variant modifier.

## Props

| Prop        | Status   | Type              | Default  | Description   |
| ----------- | -------- | ----------------- | -------- | ------------- |
| `color`     | Optional | `'dark' \| 'red' \| 'green' \| 'amber' \| 'blue'` | `'dark'` | Color variant |
| `children`  | Optional | `React.ReactNode` | —        | Tag content   |
| `className` | Optional | `string`          | —        | Additional class for the root element |

All other `span` HTML attributes are forwarded.

## Example

```tsx
import { Tag } from "@tetherto/mdk-react-devkit"

<Tag>Default</Tag>
<Tag color="green">Active</Tag>
<Tag color="red">Error</Tag>
<Tag color="amber">Warning</Tag>
<Tag color="blue">Info</Tag>
```
