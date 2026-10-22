# @tetherto/mdk-ui-foundation

Framework-agnostic headless foundation for the MDK toolkit. Pure TypeScript — no React imports.
Consumed by framework adapters (`@tetherto/mdk-react-adapter`, future `@tetherto/mdk-vue-adapter`,
etc.) which bind these primitives to the host framework.

## Surface

### State

- **Zustand vanilla stores**: `authStore`, `devicesStore`, `notificationStore`, `timezoneStore` —
  each exported as a singleton and as a `create*Store` factory for test isolation

### Data fetching

- **`createMdkQueryClient({ apiBaseUrl, auth })`**: the `@tanstack/query-core` `QueryClient` an app
  talks to its Gateway with — environment-aware base URL resolution (`VITE_MDK_API_URL`), an
  auth-aware fetcher, and a session that ends on a `401`
- **`getFetcher(client)` / `getApiBaseUrl(client)`**: read the client's authenticated fetcher and
  base URL, to call your Gateway routes with the session's token

### Auth

- **Providers**: `gatewayRedirectAuth({ oauthBaseUrl })` — the Gateway's OAuth-redirect sign-in plus
  `POST /auth/token` refresh (`authTokenMutation`) on a 250 s cadence; `bearerTokenAuth()` for a
  Gateway-issued token you already hold; `noAuth()` for a Gateway without an auth plugin

### Device types and tags

[`utils/device-tags.ts`](./src/utils/device-tags.ts): `isMiner`, `isContainer`, `isAntminer`,
`isAvalon`, `isWhatsminer` (type-prefix predicates), and `appendIdToTag(s)`, `appendContainerToTag`,
`removeContainerPrefix` (the `id-` / `container-` search tags)

### API types

[`types/api-mining.types.ts`](./src/types/api-mining.types.ts) carries the shared data contracts:

- Telemetry rows: `TailLogEntry`, `PowerModeTimelineEntry`, `AlertSeverity`
- Layouts: `Rack`
- Auth: `AuthTokenRequest`, `AuthTokenResponse`
- Error class: `MdkFetchError`

Additional type modules: [`types/settings.types.ts`](./src/types/settings.types.ts), [`types/chart.types.ts`](./src/types/chart.types.ts).

## Subpath exports

| Subpath              | Purpose                                                                                |
| -------------------- | --------------------------------------------------------------------------------------- |
| `.`                  | Top-level barrel                                                                       |
| `./store`            | Zustand vanilla stores                                                                 |
| `./query`            | `createMdkQueryClient` and the client's base URL / fetcher readers                    |
| `./types`            | Shared type contracts                                                                  |
| `./stores.json`      | Machine-readable store + query-helper manifest (generated at build time)              |

## Build strategy

Fully pre-built: TypeScript → ESM JS + `.d.ts` declarations under `dist/`. Consuming framework
adapters import the compiled output.
