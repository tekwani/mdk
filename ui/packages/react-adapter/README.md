# @tetherto/mdk-react-adapter

React framework adapter for [`@tetherto/mdk-ui-foundation`](../ui-foundation/README.md). Binds
the Zustand vanilla stores and the TanStack `QueryClient` from the
headless core into React-native hooks.

## Surface

- `<MdkProvider apiBaseUrl={...}>` — wraps `QueryClientProvider` from
  `@tanstack/react-query` and exposes the resolved API base URL via
  React context. Required at the app root.
- Store hooks: `useAuth`, `useDevices`, `useTimezone`,
  `useNotifications` — one per core store, implemented
  with `useStore(<vanillaStore>)` from `zustand`.
- Utility hooks: permissions (`useHasPerms`, `useCheckPerm`,
  `useIsFeatureEditingEnabled`), auth token lifecycle (`useAuthToken`,
  `useTokenPolling`), timezone formatting (`useTimezoneFormatter`), and UI
  helpers (`usePagination`, `useLocalStorage`, `useKeyDown`,
  `useWindowSize`, `useDeviceResolution`, `usePlatform`, `useBeepSound`,
  `useContextualModal`, `useSubtractedTime`, `useGetAvailableDevices`).
- Installed-app hooks: `useInstalledAppUis`, `useInstalledAppPanels`.
- Re-exports of `useQuery`, `useMutation`, `useQueryClient` from
  `@tanstack/react-query` so consumers can stay on a single import path.

## Authentication

`<MdkProvider auth={...}>` takes an `AuthProvider` (from [`@tetherto/mdk-ui-foundation`](../ui-foundation/README.md)) —
the seam `useMdkAuth()` reads back. Three are available:

- `noAuth()` — no token, no sign-in, nothing to expire; for a Gateway running without an auth plugin (local dev)
- `bearerTokenAuth()` — a Gateway-issued token you already hold, sent as a bearer header; session ends on a `401`.
  `createMdkQueryClient`'s own default when no provider is passed
- `gatewayRedirectAuth({ oauthBaseUrl })` — OAuth-redirect token capture, refresh polling,
  and role parsing against the Gateway; `MdkProvider`'s own default, minus `oauthBaseUrl`, so
  `signIn()` throws until one is supplied

> [!IMPORTANT]
> The frontend seam is complete and tested, but `gatewayRedirectAuth()`'s `refresh()` calls `POST /auth/token`,
> which MDK does not serve, `/auth/userinfo` included.
> Add an [app](../../../docs/guides/gateway/plugins.md) serving `/auth/token` (mounted at `/`), or use `noAuth()` /
> `bearerTokenAuth()` until you do.

Hiding a write control in the UI is not authorization: the Gateway still denies a request the token is not allowed to
make. Gate controls for UX, but enforce identity in the [Gateway controller](../../../docs/guides/gateway/plugins.md#auth-and-permissions).

## Reading your own data

The adapter ships no data hooks for specific endpoints. A page reads the routes
your [Gateway plugin](../../../docs/guides/gateway/plugins.md) serves with
`useQuery`, shapes the response in `select`, and passes the result to a devkit
component as props:

```tsx
import { useMdkContext, useQuery } from '@tetherto/mdk-react-adapter'
import { LineChartCard } from '@tetherto/mdk-react-devkit'

const HashrateCard = () => {
  const { apiBaseUrl } = useMdkContext()
  const { data, isLoading } = useQuery({
    queryKey: ['site', 'history', 'hashrate'],
    queryFn: () => fetch(`${apiBaseUrl}/site/history?metric=hashrate`).then((r) => r.json()),
    select: toChartCardData, // your mapping from the route's shape to ChartCardData
  })
  return <LineChartCard title="Hashrate" data={data} isLoading={isLoading} />
}
```

The [mvp-site example](../../../examples/mvp-site/README.md) does this end to end against its `site` plugin.

## Machine-readable hook manifest

Every hook is listed in [`dist/hooks.json`](./dist/hooks.json) (regenerated at build time). Agents
and tooling load it via the subpath export:

```js
import { hooks } from '@tetherto/mdk-react-adapter/hooks.json' with { type: 'json' }

hooks.map((h) => h.name)
hooks.filter((h) => h.category === 'permission')
```

## Subpath exports

| Subpath       | Purpose                                       |
| ------------- | --------------------------------------------- |
| `.`           | Top-level barrel                              |
| `./provider`  | `<MdkProvider>` + the `MdkContext` it powers  |
| `./hooks`     | Store hooks, utility hooks, TanStack re-exports |
| `./hooks.json` | Machine-readable hook manifest (generated at build time) |

## Build strategy

`tsc -p tsconfig.build.json` emits ESM JS + `.d.ts` declarations into
`dist/`, and the package `exports` map resolves there. External npm
consumers get pre-built declarations and runtime JS — no compile step
required on their end.
