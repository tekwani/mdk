# ContainerDetail

Container detail page shell: a back link, the container name, and a per-model
tab strip. Purely presentational — the page resolves the tab list (via the
foundation tab matrix `getSupportedContainerTabs`), owns the active tab and
routing, and supplies the active tab's body as `children`. This is the frame
every container detail tab mounts into.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `name` | `ReactNode` | yes | — | Container display name shown in the header |
| `tabs` | `{ key: string; label: string }[]` | yes | — | Ordered tabs for this container model (resolved by the page) |
| `activeTab` | `string` | yes | — | Currently active tab key |
| `onTabChange` | `(tab: string) => void` | yes | — | Fired with the next tab key when the operator switches tabs |
| `onBack` | `() => void` | yes | — | Fired when the back link is clicked (the page decides where to go) |
| `backLabel` | `ReactNode` | no | `"Explorer"` | Back-link label |
| `children` | `ReactNode` | no | — | The active tab's body (real content or `<ContainerDetailPlaceholder>`) |
| `className` | `string` | no | — | Additional class for the root element |

## Example

```tsx
import {
  ContainerDetail,
  ContainerDetailPlaceholder,
  useThingDetail,
} from "@tetherto/mdk-react-devkit"
import { CONTAINER_TAB_LABEL, getSupportedContainerTabs } from "@tetherto/mdk-ui-foundation"

const { thing } = useThingDetail(id)
const tabs = getSupportedContainerTabs(thing?.type).map((key) => ({
  key,
  label: CONTAINER_TAB_LABEL[key],
}))

<ContainerDetail
  name={thing?.name ?? id}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={(next) => navigate(detailPath(id, next, backUrl))}
  onBack={() => navigate(backUrl ?? "/explorer")}
>
  <ContainerDetailPlaceholder label={activeLabel} />
</ContainerDetail>
```

## Notes

- The shell does not fetch data or own routing — the page resolves the tab
  list from the foundation tab matrix, reads `:id` / `:tab` / `backUrl` from the
  URL, and passes navigation callbacks in.
- Tab bodies are supplied as `children`; use `<ContainerDetailPlaceholder>` for
  tabs whose real content has not been built yet.
- When `tabs` is empty (an unknown / unsupported container type) the shell
  renders an empty state instead of the tab strip.
