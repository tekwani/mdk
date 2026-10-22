# `TimelineSelector`

Dropdown for picking the dashboard time range — wraps [`core/Select`](../../../../primitives/components/select/index.tsx) with the
canonical option list from `getTimelineOptions`. Controlled: the page owns
the selected timeline and passes it to its chart queries.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onChange` | Required | `(next: string) => void` | - | Called whenever the user picks a new option |
| `value` | Required | `string` | - | Currently selected timeline value (e.g. `'1m'`, `'5m'`) |
| `className` | Optional | `string` | - | Tailwind/BEM class hook on the trigger |
| `label` | Optional | `string` | `"Time range"` | ARIA label / placeholder for the trigger |
| `options` | Optional | `TimelineOption[]` | `getTimelineOptions()` | Available options — defaults to {@link getTimelineOptions}. Pass a custom list to localise labels or restrict the range |
<!-- END GENERATED: props -->

## Example

```tsx
const [timeline, setTimeline] = useState("5m")

<TimelineSelector value={timeline} onChange={setTimeline} />
```
