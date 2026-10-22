# `HeaderActions`

Top-bar buttons designed to live in the `actions` slot of `<AppHeader>`:
`AlarmsBellButton` and `ProfileMenu`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `AlarmsBellButton` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Additional class names |
| `counts` | Optional | `AlarmsBellButtonCounts` | `{}` | Severity-bucketed alarm counts rendered in the stacked badge |
| `label` | Optional | `string` | `"Active alarms"` | Accessible label. Defaults to "Active alarms" |
| `onClick` | Optional | `((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)` | - | Click handler — typically opens an alerts panel or routes to /alerts |
| `onSeverityClick` | Optional | `((severity: AlarmSeverity, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)` | - | Click handler for an individual severity count. When provided, each badge row becomes its own button so an operator can jump straight to the alerts page filtered by that severity (e.g. `/alerts?severity=critical`). When omitted, the counts render as plain (non-interactive) text |

### `ProfileMenu` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `items` | Required | `ProfileMenuItem[]` | - | Items rendered in the dropdown, top-to-bottom |
| `className` | Optional | `string` | - | Additional class names |
| `icon` | Optional | `React.ReactNode` | `<UserAvatarIcon />` | Override the trigger icon — defaults to the user-avatar icon |
| `label` | Optional | `string` | `"Profile menu"` | Accessible label for the trigger button |
| `user` | Optional | `React.ReactNode` | - | Optional user label rendered at the top of the dropdown (e.g. an email) |

### `AlarmsBellButtonCounts`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `critical` | Optional | `number` | - | Critical alarm count, shown as the top badge row; omit to hide the row |
| `high` | Optional | `number` | - | High alarm count, shown as the middle badge row; omit to hide the row |
| `medium` | Optional | `number` | - | Medium alarm count, shown as the bottom badge row; omit to hide the row |

### `ProfileMenuItem`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `label` | Required | `string` | - | Item text; also used as the React key, so keep it unique within `items` |
| `onSelect` | Required | `() => void` | - | Called when the item is chosen by click or keyboard |
| `danger` | Optional | `boolean` | - | Render as a destructive action (red) |
| `description` | Optional | `React.ReactNode` | - | Optional secondary line under the label (e.g. "Current: Europe/Podgorica") |
| `disabled` | Optional | `boolean` | - | Disable the menu item |
| `icon` | Optional | `React.ReactNode` | - | Optional leading icon |
<!-- END GENERATED: props -->

## `AlarmsBellButton`

Renders a bell icon with a three-line severity-stacked count badge
(critical / high / medium). Counts are caller-provided — bucket the rows
your alerts route returns.

```tsx
import { AlarmsBellButton } from '@tetherto/mdk-react-devkit'

// `incidents` comes from your own alerts route.
const counts = (incidents ?? []).reduce(
  (acc, row) => ({
    ...acc,
    [row.severity]: (acc[row.severity] ?? 0) + 1,
  }),
  { critical: 0, high: 0, medium: 0 },
)

<AlarmsBellButton counts={counts} onClick={() => navigate('/alerts')} />
```

## `ProfileMenu`

A dropdown wrapping the core `DropdownMenu`. The trigger renders the
user-avatar icon (override via `icon`). The `items` array drives the menu
surface — keep it short.

```tsx
import { ProfileMenu, authStore } from '@tetherto/mdk-react-devkit'

<ProfileMenu
  user={currentUserEmail}
  items={[
    {
      label: 'Sign out',
      onSelect: () => {
        authStore.getState().reset()
        navigate('/signin')
      },
      danger: true,
    },
  ]}
/>
```

## Notes

- Both buttons own their styles in cascade layer `mdk`; consumer overrides
  in `app` win without specificity hacks
- The bell badge hides itself entirely when all counts are undefined — the
  empty state is the loading state too
