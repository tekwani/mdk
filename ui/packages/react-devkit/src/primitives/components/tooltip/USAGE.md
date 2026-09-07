# Tooltip

Hover-triggered floating label built on Radix UI. Two ways to use it:

- **`SimpleTooltip`** — one-prop wrapper, recommended for most cases.
- **`Tooltip` + sub-parts** — full composition for advanced control.

## `SimpleTooltip` props

| Prop            | Status   | Type        | Default | Description                          |
| --------------- | -------- | ----------- | ------- | ------------------------------------ |
| `content`       | Required | `ReactNode` | —       | Tooltip body (string or JSX)         |
| `children`      | Required | `ReactNode` | —       | Trigger element (any focusable node) |
| `side`          | Optional | `"top" \| "right" \| "bottom" \| "left"` | `"top"` | Side relative to trigger |
| `sideOffset`    | Optional | `number`    | `8`     | Distance from the trigger (px)       |
| `delayDuration` | Optional | `number`    | `200`   | Hover delay before showing (ms)      |
| `showArrow`     | Optional | `boolean`   | `true`  | Render a directional arrow           |
| `className`     | Optional | `string`    | —       | Content class names                  |

## Composable parts

```tsx
<TooltipProvider delayDuration={200}>
  <Tooltip>
    <TooltipTrigger asChild><InfoIcon /></TooltipTrigger>
    <TooltipContent side="right">Helpful explanation</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Example

```tsx
<SimpleTooltip content="Refresh data" side="bottom">
  <Button icon={<ReloadIcon />} aria-label="Refresh" />
</SimpleTooltip>
```

## Notes

- For click-triggered panels, use `Popover` instead
- If `content` is empty/null, `SimpleTooltip` renders the trigger unwrapped
- Wrap your app in a single `<TooltipProvider>` when you have many tooltips
  to share the open/close timing logic
