# Typography

Single component for all text rendering. Pick a semantic `variant` to get the
right element + base style; override `size` / `weight` / `color` ad hoc when
needed.

## Props

| Prop        | Status   | Type                                                                           | Default     | Description                              |
| ----------- | -------- | ------------------------------------------------------------------------------ | ----------- | ---------------------------------------- |
| `children`  | Optional | `ReactNode`                                                                    | —           | Text or inline content                   |
| `variant`   | Optional | `"heading1" \| "heading2" \| "heading3" \| "body" \| "secondary" \| "caption"` | `"body"`    | Determines the element and base style    |
| `size`      | Optional | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl" \| "3xl" \| "4xl"`              | —           | Override font size (per-variant default) |
| `weight`    | Optional | `"light" \| "normal" \| "medium" \| "semibold" \| "bold"`                      | —           | Override font weight                     |
| `color`     | Optional | `TypographyColor`                                                              | `"default"` | Token-based text color                   |
| `align`     | Optional | `"left" \| "center" \| "right" \| "justify"`                                   | —           | Text alignment                           |
| `truncate`  | Optional | `boolean`                                                                      | `false`     | Single-line truncation with ellipsis     |
| `className` | Optional | `string`                                                                       | —           | Additional class names                   |

All other native HTML attributes are forwarded onto the underlying element.

### Variant → element mapping

| Variant     | Element  |
| ----------- | -------- |
| `heading1`  | `<h1>`   |
| `heading2`  | `<h2>`   |
| `heading3`  | `<h3>`   |
| `body`      | `<p>`    |
| `secondary` | `<p>`    |
| `caption`   | `<span>` |

## Example

```tsx
<Typography variant="heading1">Operations dashboard</Typography>
<Typography variant="body">A high-level summary of your sites.</Typography>
<Typography variant="caption" color="muted">Updated 12s ago</Typography>
```

## Notes

- Use `variant` over raw `<h1>`/`<p>` tags so headings stay on-token
- For numeric labels in cards, prefer `<Typography variant="heading3">` with
  `color="muted"` instead of inventing inline styles
