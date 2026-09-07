# EmptyState

Placeholder shown when a list, table or panel has no data to display.

## Props

| Prop          | Status   | Type                                 | Default     | Description                    |
| ------------- | -------- | ------------------------------------ | ----------- | ------------------------------ |
| `description` | Required | `ReactNode`                          | —           | Message shown below the image  |
| `image`       | Optional | `"default" \| "simple" \| ReactNode` | `"default"` | Built-in illustration, simple icon, or custom node |
| `size`        | Optional | `"sm" \| "md" \| "lg"`               | `"md"`      | Controls icon size and spacing |
| `className`   | Optional | `string`                             | —           | Root class names               |

## Example

```tsx
<EmptyState description="No miners found" />
<EmptyState description="No alerts in the selected range" image="simple" size="sm" />
<EmptyState
  description={<span>No data &mdash; try a different filter.</span>}
/>
```

## Notes

- Use inside the body of tables and cards, not as the root of a page
- Pass a custom `image` (e.g. a brand illustration) to replace the icon
