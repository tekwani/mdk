# TagFilterBar

Cascader-based filter bar for the alerts table. Lets operators filter by tags, alert type, severity, and other site-specific dimensions.

## Props

| Prop                   | Status   | Type                                   | Default | Description                          |
| ---------------------- | -------- | -------------------------------------- | ------- | ------------------------------------ |
| `filterTags`           | Required | `string[]`                             | —       | Active tag filter values             |
| `localFilters`         | Required | `AlertLocalFilters`                    | —       | Current local filter state           |
| `onSearchTagsChange`   | Required | `(tags: string[]) => void`             | —       | Called when tag filter changes       |
| `onLocalFiltersChange` | Required | `(filters: AlertLocalFilters) => void` | —       | Called when any local filter changes |
| `typeFiltersForSite`   | Optional | `CascaderOption[]`                     | —       | Site-specific type filter options    |
| `placeholder`          | Optional | `string`                               | —       | Search input placeholder             |
| `className`            | Optional | `string`                               | —       | Additional CSS class                 |

## Minimal example

```tsx
import { TagFilterBar } from "@tetherto/mdk-react-devkit";

<TagFilterBar
  filterTags={[]}
  localFilters={{}}
  onSearchTagsChange={(tags) => setTags(tags)}
  onLocalFiltersChange={(f) => setFilters(f)}
/>
```
