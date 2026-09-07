# Sidebar

Application sidebar with collapsible state (persisted via `localStorage`),
optional overlay mode, and item-click + active-item highlighting.

## Props

| Prop               | Status   | Type                              | Default | Description                            |
| ------------------ | -------- | --------------------------------- | ------- | -------------------------------------- |
| `items`            | Required | `SidebarMenuItem[]`               | —       | Menu items (supports nested `items`)   |
| `activeId`         | Optional | `string`                          | —       | Currently active item id               |
| `onItemClick`      | Optional | `(item: SidebarMenuItem) => void` | —       | Item-click handler                     |
| `expanded`         | Optional | `boolean`                         | —       | Controlled expanded state              |
| `onExpandedChange` | Optional | `(expanded: boolean) => void`     | —       | Setter for the expanded state          |
| `defaultExpanded`  | Optional | `boolean`                         | `false` | Initial expanded state                 |
| `visible`          | Optional | `boolean`                         | `true`  | Hide entirely without unmounting       |
| `overlay`          | Optional | `boolean`                         | `false` | Show as fixed overlay with backdrop    |
| `onClose`          | Optional | `VoidFunction`                    | —       | Called when the backdrop or ESC closes |
| `header`           | Optional | `ReactNode`                       | —       | Header content (e.g. logo, app name)   |
| `className`        | Optional | `string`                          | —       | Additional class names                 |

## Example

```tsx
<Sidebar
  items={[
    { id: "/dashboard", label: "Dashboard" },
    { id: "/alerts", label: "Alerts" },
  ]}
  activeId={location.pathname}
  onItemClick={({ id }) => navigate(id)}
/>
```

## Data contracts

```ts
type SidebarMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  items?: SidebarMenuItem[];
};
```
