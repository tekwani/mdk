# `LabeledCard`

A generic card container with a header label, optional navigation link, and configurable layout modifiers.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Optional | `React.ReactNode` | - | Card body content |
| `className` | Optional | `string` | - | Additional class for the root element |
| `getNavigateOptions` | Optional | `(label: string) => Partial<{ href: string; target: string }>` | - | Returns a link `href`/`target` for the label when provided |
| `hasNoBorder` | Optional | `boolean` | `false` | Removes the card border |
| `hasNoMargin` | Optional | `boolean` | `false` | Removes default margin |
| `hasNoWrap` | Optional | `boolean` | `false` | Prevents content from wrapping |
| `isDark` | Optional | `boolean` | `false` | Applies a dark background modifier |
| `isFullHeight` | Optional | `boolean` | `false` | Stretches the card to full container height |
| `isFullWidth` | Optional | `boolean` | `false` | Stretches the card to full container width |
| `isRelative` | Optional | `boolean` | `false` | Sets `position: relative` on the container |
| `isScrollable` | Optional | `boolean` | `false` | Enables vertical scroll on the card body |
| `label` | Optional | `React.ReactNode` | - | Header content shown above the card body |
| `labelTooltip` | Optional | `React.ReactNode` | - | Tooltip shown when hovering the label, e.g. to explain what a count includes |
<!-- END GENERATED: props -->

## Example

```tsx
import { LabeledCard } from "@tetherto/mdk-react-devkit"

<LabeledCard label="Device Overview" isFullWidth>
  <p>Content goes here.</p>
</LabeledCard>

// With a navigation link and a tooltip on the label
<LabeledCard
  label="Miners with error"
  labelTooltip="Excludes minor errors that don't affect hashrate"
  getNavigateOptions={(label) => ({ href: "/miners?filter=error" })}
>
  <MinerList />
</LabeledCard>
```

## Notes

- `labelTooltip` wraps the label in a tooltip; any label can have one
- `getNavigateOptions` only activates when `label` is a plain string
