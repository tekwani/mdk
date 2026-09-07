# Popover

Floating panel anchored to a trigger element. Built on Radix UI; use the
composable parts for full control, or `SimplePopover` for the common case.

## Composition

```tsx
<Popover>
  <PopoverTrigger asChild><Button>Open</Button></PopoverTrigger>
  <PopoverContent side="bottom" align="start" showArrow showClose>
    <p>Hello!</p>
  </PopoverContent>
</Popover>
```

## `Popover` (root) props

| Prop           | Status   | Type      | Default | Description                 |
| -------------- | -------- | --------- | ------- | --------------------------- |
| `open`         | Optional | `boolean` | —       | Controlled open state       |
| `defaultOpen`  | Optional | `boolean` | `false` | Uncontrolled initial state  |
| `onOpenChange` | Optional | `(open: boolean) => void` | —       | Open-state change handler   |
| `modal`        | Optional | `boolean` | `false` | Trap focus inside the panel |

## `PopoverContent` props

| Prop         | Status   | Type                                     | Default    | Description                    |
| ------------ | -------- | ---------------------------------------- | ---------- | ------------------------------ |
| `side`       | Optional | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | Side relative to the trigger   |
| `align`      | Optional | `"start" \| "center" \| "end"`           | `"center"` | Alignment along the side       |
| `sideOffset` | Optional | `number`                                 | `8`        | Distance from the trigger (px) |
| `showArrow`  | Optional | `boolean`                                | `false`    | Render a directional arrow     |
| `showClose`  | Optional | `boolean`                                | `false`    | Render a close (×) button      |
| `className`  | Optional | `string`                                 | —          | Content class names            |

## Example

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button>Filters</Button>
  </PopoverTrigger>
  <PopoverContent side="bottom" align="end" showArrow>
    <FilterForm />
  </PopoverContent>
</Popover>
```

For the common trigger-plus-panel case, prefer `SimplePopover`:

```tsx
<SimplePopover trigger={<Button>Open</Button>} content={<p>Hello</p>} />
```

## Notes

- `PopoverContent` automatically portals to `document.body`
- For tooltips that appear on hover, use `<Tooltip>` instead
