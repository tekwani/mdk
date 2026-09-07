# Tabs

Tabbed content panels built on Radix UI. Compose with `TabsList`,
`TabsTrigger`, and `TabsContent`.

## `Tabs` (root) props

| Prop            | Status   | Type                         | Default        | Description                       |
| --------------- | -------- | ---------------------------- | -------------- | --------------------------------- |
| `value`         | Optional | `string`                     | —              | Controlled active tab value       |
| `defaultValue`  | Optional | `string`                     | —              | Uncontrolled initial active value |
| `onValueChange` | Optional | `(value: string) => void`    | —              | Fired when the active tab changes |
| `orientation`   | Optional | `"horizontal" \| "vertical"` | `"horizontal"` | Keyboard navigation orientation   |
| `className`     | Optional | `string`                     | —              | Root class names                  |

## `TabsList` / `TabsTrigger` props

Both accept a `variant` prop that has no effect on `Tabs` itself:

| Prop      | Status   | Type | Default     | Description |
| --------- | -------- | ---- | ----------- | ----------- |
| `variant` | Optional | `"default" \| "side" \| "underline"` | `"default"` | `default` (baseline), `side` (left rail), or `underline` (per-tab underline indicator, white active label) |

## Example

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="alerts">Alerts</TabsTrigger>
    <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    <p>Operational metrics…</p>
  </TabsContent>
  <TabsContent value="alerts">
    <CurrentAlerts data={[]} />
  </TabsContent>
</Tabs>
```

## Notes

- Each `TabsContent` is matched to its `TabsTrigger` by `value`
- Set `variant="side"` on `TabsList` and each `TabsTrigger` for a left-side tab rail layout
- Set `variant="underline"` on `TabsList` and each `TabsTrigger` for a top tab bar with a per-tab underline
  indicator and a white active label
