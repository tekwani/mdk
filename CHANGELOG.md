# Changelog: mdk-0.12.0

> For a high-level introduction, see the [release notes](./docs/reference/release-notes/0.12.0-release.md)

v0.12.0 will be released in two parts. Firstly this early release to support the public release of 
npm packages. Further to that, a patch will be released providing documentation for v0.12.0.

## v0.12.0

- Replaces **Gateway plugins with MDK apps**: each app runs in its own `@tetherto/mdk-app-runtime` process, the Gateway only
  reads its route table and forwards requests over HRPC, and stacks declare apps under `spec.apps` instead of
  `spec.gateway.plugins`
- Makes **Kernel and Worker admission fail-closed**: an empty allowlist admits nobody, allowlist entries carry `read`, `write`
  or `admin` roles, and processes on one machine admit each other through a shared trusted-keys directory
- Stops the Kernel **auto-retrying unconfirmed commands** and adds declared command **verification**, so a command result says
  whether the device accepted it, finished it, and was seen in the requested state
- Adds **`mdk add app|worker`** and **`mdk validate app|worker`** to the CLI, and lets the operator shell load the UIs of
  installed apps
- Scaffolds **TypeScript 7** projects: `mdk create dashboard` and `mdk create app` set up `typescript@^7.0.2`, and the
  dashboard lints with type-aware oxlint instead of ESLint
- Narrows **`@tetherto/mdk-react-devkit`** to its generic surface: the Pool Manager, the Explorer, the Reporting tool, the
  vendor container widgets, Inventory and Repairs, the page-level `Alerts` and `ContainerDetail`, and the utils, constants
  and types nothing used leave the package (779 exports), and **`@tetherto/mdk-react-adapter`** drops every data hook that called a route no MDK backend serves
  (335 exports), and **`@tetherto/mdk-ui-foundation`** drops its `./presets/mining` entry point and the device-action builders
- Builds the UI packages with **TypeScript 7**: the published `.d.ts` files keep the source's quote style, list union members
  in a stable order, and keep JSDoc on memoised components; the exported types are unchanged

## Breaking changes

### Gateway plugins become apps

The in-process Gateway plugin model has evolved to simplify how apps integrate with plugins. Plugins are recognized now as route tables (REST API), serving an app. An app provides the UI surface and is composed of a package with a `mdk-app.yaml` manifest and a route table (plugin)
(`plugin/mdk-plugin.json`), and runs in its own [`@tetherto/mdk-app-runtime`](backend/core/app-runtime/README.md) process.
The Gateway reads each app's route table and forwards every request to that runtime over HRPC, so it runs no app code.

| Before                                          | Now                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `startGateway({ extraPluginDirs })`             | `startGateway({ apps: [{ name, appDir, keyFile, mount? }] })`; `extraPluginDirs` throws `ERR_GATEWAY_EXTRA_PLUGIN_DIRS_UNSUPPORTED` |
| Plugin routes served at the Gateway root        | App routes mount under `/apps/<name>`; `mount: '/'` keeps them at the root               |
| `spec.gateway.plugins` in `mdk.yaml`            | `spec.apps: [{ name, package, config?, mount? }]`; the old key is rejected with a ready-to-paste `spec.apps` snippet |
| `mdk create plugin <name>` into `plugins/`      | `mdk create app <name>` into `apps/`                                                     |
| `@tetherto/mdk-plugin-agent`, `@tetherto/mdk-plugin-demo` | `@tetherto/mdk-app-agent`, `@tetherto/mdk-app-demo` under [`backend/apps/`](backend/apps/) |
| `createMcpServer(..., gatewayPluginDirs)`       | `createMcpServer(..., apps, options)`; `loadGatewayPluginTools` is removed               |

`@tetherto/mdk-plugins` is removed with its bundled `auth`, `site-hashrate`, `site-monitor` and `telemetry` plugins, and so is
`bundledPluginDir()` in `@tetherto/mdk-core`. A stack that needs those routes ships them in an app of its own. A Gateway with
no runtime key for an app answers `503 ERR_APP_RUNTIME_UNAVAILABLE`. The agent app's default MCP URL moves from port `3008` to
the Gateway port plus 100 (`3947`). The [Gateway apps guide](docs/guides/gateway/plugins.md) covers the model.

### Admission is fail-closed

- **Kernel**: an empty `hrpc.whitelist` admits nobody. An entry is a hex key (full access) or `{ key, roles }` with roles
  `read`, `write` and `admin`, and a caller outside its roles gets `ERR_KERNEL_ACTION_FORBIDDEN`. `hrpc.allowAll: true` is a
  development escape hatch that logs a warning. `KernelManager` gains `allowKey`, `revokeKey`, `listAllowedKeys`,
  `allowWorkerKey` and `getClientPublicKey`.
- **Worker discovery**: only keys on `discovery.workerKeys` register from the DHT topic, unless `discovery.allowAnyWorker: true`
- **Workers**: `WorkerRuntime` refuses to start without `allowedKeys` (`ERR_WORKER_ALLOWED_KEYS_REQUIRED`) unless
  `allowAll: true`, and rejects callers that are not on the list (`ERR_WORKER_CALLER_NOT_ALLOWED`). Every in-repo Worker boot
  helper (`startAvalonWorker`, `startOceanPoolWorker` and the rest) takes the new `allowedKeys` and `allowAll` options.
- **Trusted-keys directory**: `getKernel()` publishes `kernel.pub` to `<root>/.trusted-keys` (`DEFAULT_TRUSTED_KEYS_DIR`) and
  admits every other `<name>.pub` there. `startGateway()` publishes `gateway.pub`, and the CLI publishes the MCP server, app runtime
  and CLI keys. `trustedKeysDir: false` turns this off.
- **Caller identity**: the Kernel takes the caller from the transport key and overwrites `requesterId` and non-admin `voter`

To upgrade, allowlist every Gateway, MCP server, CLI and app runtime key (or keep them on one machine and let the trusted-keys
directory admit them), list Workers in `workerKeys`, and give each Worker the Kernel's `getClientPublicKey()`. The
[security blueprint](docs/guides/security/index.md) walks through it.

### Commands are no longer retried

The Kernel never re-sends a command it cannot confirm was delivered. An unconfirmed send settles as `TIMEOUT` with
`ERR_COMMAND_UNCONFIRMED`, and crash recovery marks dispatched or executing commands `TIMEOUT` instead of re-queuing them.
`commandMaxRetries`, the `retries` status field, `ERR_MAX_RETRIES_EXHAUSTED` and `ERR_RECOVERY_EXHAUSTED` are removed. Reconcile
by reading device state back, or declare `verify` on the command (see Added). Terminal results stay readable for
`commandResultTtlMs` (24 hours by default) instead of being deleted on completion.

### Gateway defaults are tightened

- `trustProxy` defaults to `false`, and the default `GET /echo` route is gone
- Helmet headers and rate limiting (300 requests per minute per IP, `ERR_RATE_LIMITED`) are on, and `bodyLimit` defaults to 1 MiB
- A Host allowlist answers `403 ERR_GATEWAY_HOST_NOT_ALLOWED` for unknown `Host` headers. Loopback on the bound port is always
  allowed, and `allowedHosts: ['*']` turns the check off.
- Routes marked `"auth": true` answer `401 ERR_AUTH_UNAUTHORIZED` unless an `authVerifier` is set; `'loopback'` is built in
- `?overwriteCache=true` needs a verified identity with `cache:overwrite` in its `perms`
- `authorization`, `proxy-authorization` and `cookie` headers are not forwarded to apps
- `common.json.example` drops `orks`, `cacheTiming` and `featureConfig`, adds `trustProxy`, `allowedHosts`, `bodyLimit`,
  `rateLimit` and `appTimeoutMs`, and serves static files only when `staticRootPath` is set

### Signal handling is opt-in

`getKernel()`, a standalone `startGateway()`, `createMcpServer()`, the pool service and the F2Pool and Ocean Worker boot helpers no
longer install `SIGINT`/`SIGTERM` handlers. Pass `handleSignals: true`, or call `shutdown()` or `stop()` from your own handler.

### Package entry points

Backend packages that had no `exports` map now declare one with `files`, so deep imports outside these subpaths fail with
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

| Package                | Exported subpaths                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `@tetherto/mdk-kernel` | `.`, `./protocol/actions`, `./protocol/envelope`, `./protocol/schemas`                        |
| `@tetherto/mdk-client` | `.`                                                                                           |
| `@tetherto/mdk-mcp`    | `.`, `./plugin`                                                                               |
| `@tetherto/mdk-worker` | `.`, `./device`, `./lib/module-context`, `./lib/worker-runtime`, `./mdk-contract.schema.json` |
| `@tetherto/mdk-core`   | `.`, `./lib/local-discovery`                                                                  |

Every package also exports `./package.json`.

### Other breaking changes

- **`startServices()`** requires `config.repoRoot` (`ERR_MDK_REPO_ROOT_REQUIRED`), refuses to overwrite files it did not generate
  (`ERR_MDK_GENERATED_FILE_CONFLICT`) unless `overwrite: true`, and binds Docker ports to `127.0.0.1` unless `host` is set.
  `initialize()` requires `opts.sources`.
- **Route tables are validated more strictly**: paths start with `/`, `auth` is a boolean, a repeated method and path is
  `ERR_PLUGIN_ROUTE_DUPLICATE_PATH`, a handler outside the app directory is `ERR_PLUGIN_HANDLER_OUTSIDE_PLUGIN`, and an
  `http.requestBody` schema validates the body
- **Caller queries are sanitized** in `@tetherto/mdk-core`. `applyFilters` and `projection` reject code and expression operators,
  `opts.*` paths other than `opts.address` and `opts.port`, secret fields and oversized queries (`ERR_QUERY_*`), and `$regex`
  becomes a literal search.
- **The built-in `health` telemetry** returns identifiers only, not `opts`, `env` or `config`
- **`mdk run mcp` hides write tools** unless `--allow-write`, `spec.mcp.allowWrite: true` or `spec.mcp.allowTools` allows them
- **`mdk.yaml` names are stricter**: Worker, stack and dashboard names use lowercase letters, digits, `.`, `_` or `-`
- **`mdk onboard` needs Node 24**, matching the `engines` field every package already declared
- **`WidgetTopRow` takes its alarm categories as a prop.** `alarms` is now `{ title, icon, items }[]`, one entry per badge in
  display order, instead of a `liquidAlarms` / `leakageAlarms` / `pressureAlarms` / `otherAlarms` map over four fixed cooling
  categories. The primitive alarm icons (`TemperatureAlarmIcon`, `FluidAlarmIcon`, `PressureAlarmIcon`, `OtherAlarmIcon`)
  rebuild the old set.
- **`DataLabel` no longer reads the timezone store**: it takes an optional `timezone` prop and defaults to the browser's
  timezone. Pass `useTimezone().timezone` to keep following the user's selection.
- **`CurrentAlerts` skips its sound-notification confirmation modal in `isDemoMode`**
- **`DeviceExplorer` takes its columns as a prop.** `columns` defaults to the miner columns, and `getMinerColumns` is
  exported to extend them. The Container / Miner / Cabinet tabs and their columns are removed with `deviceType`,
  `onDeviceTypeChange`, `renderAction`, `DEVICE_EXPLORER_DEVICE_TYPE` and `DeviceExplorerDeviceType`; add an action
  column through `columns`, and render one explorer per device kind if you need tabs.
- **`Device` lists only the fields the devkit reads**: `id`, `type`, `code`, `tags`, `address`, `info`, `last` and `alerts`.
  Other fields still type-check through its index signature as `unknown`, so narrow them where you read them. `last.snap` is
  a `DeviceSnap` (`stats.status`, `config.firmware_ver`, `config.power_mode`, and an index signature) in place of
  `ContainerSnap`, and `getDeviceData` returns a `DeviceData` without `rack`, `username` or `containerId`.

## Added

### `@tetherto/mdk-app-runtime`

[`backend/core/app-runtime`](backend/core/app-runtime/README.md) hosts one app per process and ships the `mdk-app-runtime`
binary. It exports `createAppRuntime`, `getOrCreateSeed`, `createRuntimeClient`, `pipeToResponse`, `loadAppManifest`,
`validateAppManifest` and `resolvePluginDir`. A runtime admits only the keys in `allowedKeys` or `allowedKeyFiles`, and the
Gateway writes the one key it presents to every runtime to `gatewayKeyFile`.

### Command verification

A contract command can declare `verify: { telemetry, param, withinMs }`. The Kernel reads the device back after the command
and reports `verification.state` as `PENDING`, `VERIFIED`, `UNVERIFIED` or `NOT_DECLARED`, separately from acceptance and the
terminal state. `@tetherto/mdk-client` gains `getCommandStatus(commandId)`. The Avalon `setPowerMode` command declares one.

### `@tetherto/mdk-worker` validators

`validateContract(contract, { dir?, semantic })` returns `ERR_CONTRACT_*` strings, and `validateParams(declared, params)` returns
`ERR_PARAM_*` strings. `WorkerRuntime` now rejects a command whose parameters do not match the contract before the handler runs.

### CLI

| Command                        | What it does                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `mdk add app\|worker <source>` | Installs a package from npm or GitHub (`--ignore-scripts --save-exact`), validates it, then adds it to `package.json` and `mdk.yaml`. A refused package changes nothing. |
| `mdk validate app <name>`      | Checks `mdk-app.yaml`, the route table and its handler files, and the built UI                  |
| `mdk validate worker [name]`   | Checks `mdk-contract.json` against the schema and semantic rules. `--path` checks any directory, and `--smoke` adds behavioural checks against a mock device. |
| `mdk create app <name>`        | Scaffolds an app with `mdk-app.yaml`, a route table, a controller and a starter React UI        |
| `mdk run app <name>`           | Runs one app. `mdk run` starts every `spec.apps` entry, and `mdk run dashboard` passes them to the shell. |

`mdk run` holds a single-instance lock per process under `.mdk/run/`, and `mdk status` lists apps and their mounts. `spec.mcp`
gains `allowWrite`, `allowTools`, `token` and `identity`, and `${VAR}` placeholders in app, Gateway and MCP config resolve from
the environment, then the project `.env`. `mdk onboard` writes secret answers to `.env` (mode `0600`) and keeps a placeholder in
`mdk.yaml`. `mdk --help` groups commands, and every command has examples.

### Skill suite

`@tetherto/mdk-skill` ships two new skills: `mdk-create-app` for the app package workflow, and `mdk-publish-security` for a
pre-publish audit of a package. The existing skills describe apps instead of Gateway plugins.

### App UIs in the operator shell

An app can ship a UI that the shell loads at runtime. The app's `ui/index.js` default-exports a module built with
`defineMdkApp({ id, displayName, routes, panels })`. The shell lists installed apps from `/app-ui.json`, mounts their pages
under `/app/<name>/` with sidebar entries, and renders their panels on the home page. Shared modules (React, React Router,
TanStack Query and the MDK UI packages) come from the shell through an import map.

| Package                       | New exports                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `@tetherto/mdk-react-adapter` | `defineMdkApp`, `MdkAppProvider`, `useMdkApp`, `useInstalledAppUis`, `useInstalledAppPanels`, `loadAppUi`, `loadAppUis`, `checkAppUiModule`, `MDK_APP_PANEL_SLOT` and their types |
| `@tetherto/mdk-ui-foundation` | `MDK_APP_SHARED_MODULES`, `MDK_APP_UI_BASE`, `MDK_APP_UI_MANIFEST`, `fetchAppManifest`, the `InstalledApp` types, and the `./app-shared-modules` and `./app-ui-paths` subpaths |
| `@tetherto/mdk-react-devkit`  | `getContainerName`                                                                                |

### Other additions

- `startGateway()` takes `authVerifier`, `allowedHosts`, `trustProxy`, `bodyLimit`, `rateLimit`, `helmet`, `trustedKeysDir`,
  `trustedKeyName`, `gatewayKeyFile` and `handleSignals`
- `@tetherto/mdk-client` actions take an optional trailing `{ timeout }`, requests time out after 30 seconds by default
  (`ERR_MDK_REQUEST_TIMEOUT`), and Worker replies are validated (`ERR_MDK_RESPONSE_INVALID`)
- `@tetherto/mdk-core` exports `libStats` and the query helpers `sanitizeQuery`, `escapeRegex` and `redactSecrets`
- `@tetherto/mdk-agent` sessions accept an abort `signal`, and the agent app stops a turn when the client disconnects
- The `mvp-site` example runs the external miner Workers `whatsminer-mdk-worker` and `antminer-mdk-worker` and the external pool
  Workers `emcd-mdk-worker`, `spiderpool-mdk-worker` and `foundry-mdk-worker` as commit-pinned git dependencies, names any that
  are missing at boot, and adds a Miners page

## Changed

- **`LabeledCard`** no longer adds a tooltip when its label is the string "Miners with error". Pass the new `labelTooltip`
  prop to put a tooltip on any label.
- **`ErrorBoundary`**'s default fallback renders an inline `ErrorCard` (titled "Error in" plus `componentName`, then the error
  message) above the stack trace, so a caught error looks like every other error card.
- **Antminer support moves to the manufacturer's Worker.** The in-repo `@tetherto/mdk-worker-antminer` is replaced by the
  external `antminer-mdk-worker` package, hosted on `WorkerRuntimeV2`. The `mvp-site` example's
  [`antminer-adapter.js`](examples/mvp-site/backend/antminer-adapter.js) keeps a compatible `startAntminerWorker()`, and the
  [Antminer guide](docs/guides/miners/run-antminer-worker.md) describes the setup.
- **The in-repo Worker packages are private** (`"private": true`), so they run from the workspace and are not published
- **The legacy thing and adapter Worker surface is deprecated.** `opts.services`, `createWorkerInfra`, the `*Service` classes and
  the `Thing`, `Miner`, `Container`, `PowerMeter` and `Sensor` bases still work. New Workers use `WorkerRuntimeV2`.
- **`mdk create dashboard`** defaults `--ref` to the CLI's own release tag instead of `main`
- **`installSkills()`** replaces an existing skill directory only when it carries the suite marker, refuses to install through a
  symlinked `.claude` or `.cursor` directory, and reports skipped directories in `skipped`. `mdk skill add` prints them as a
  warning.
- **The README quickstart** runs `examples/mvp-site` under PM2

## Removed

### `@tetherto/mdk-react-devkit`

The root and `./domain` entry points drop 779 exports, plus three duplicates that merge into the components they duplicated
(`StatsExport`, `ChartWrapper`, `SecondaryStatCard`). `./primitives` drops only the duplicate `Separator` re-export. There is no
drop-in replacement for the removed views: build them in your app on top of the primitives, fed by your own Gateway routes.

| Area                                           | Removed                                                         | Kept                                                              |
| ---------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| Pool Manager, actions sidebar, pending actions | 80 exports, including `PoolManager`, `ActionsSidebar`, `PendingActionsButton`, `AssignPoolModal` and `usePoolConfigs` | `AlarmsBellButton`, `ProfileMenu` |
| Explorer                                       | 95 exports, including `ExplorerLayout`, `ExplorerDetail`, the vendor control and settings panels, and `useExplorerData` | `MinerMetricCard`, `MinersActivityChart`, `SecondaryStatCard`, `SingleStatCard` |
| Reporting tool                                 | 291 exports, including `Cost`, `Ebitda`, `EnergyBalance`, `EnergyReport`, `HashBalance`, `Hashrate`, `OperationalDashboard`, `SubsidyFee` and their hooks | `TimeframeControls`, `ReportTimeFrameSelector`, `useFinancialDateRange` |
| Container widgets                              | 56 exports, including `ContainerWidgets`, `ContainerCharts`, `Socket`, `TanksBox` and `useContainerThresholds` | `GenericDataBox`, `EnabledDisableToggle` |
| Inventory and Repairs                          | 72 exports, including `MovementDetailsModal`, the spare-parts modals, `RepairLogChangesSubRow` and the spare-parts constants | — |
| Page features                                  | `Alerts`, `AlertsProps`, `ContainerDetail`, `ContainerDetailPlaceholder` and their prop and tab types | `CurrentAlerts`, `HistoricalAlerts` |
| Duplicate components                           | `StatsExport`; `ChartWrapper`; `SecondaryStatCard`; `Separator`, a bare re-export of `@radix-ui/react-separator` | `ExportButton` (its `onExport` may now return a promise), `ChartContainer` (now with `loader` and an element `emptyMessage`), `SingleStatCard` (new `compact` variant and `className`), `Divider` |
| Unused utils, constants and types              | 177 exports nothing in the toolkit used, including `ROUTE` / `ROUTE_TITLES_MAP`, `AUTH_CAPS`, the `Device` sub-types, `Container`, `ContainerSnap`, `LvCabinetRecord`, the action-name, chart, range and date-format constants, `useUpdateExistedActions`, the cabinet and power-mode utils, and the finance, metrics and config types | — |

To replace `<Alerts>`, compose `CurrentAlerts` and `HistoricalAlerts`. Both are controlled, so the page owns `localFilters`,
`filterTags` and `dateRange` and passes them to each; `initialSeverity` becomes an initial `localFilters` of `{ severity }`.
The `.mdk-alerts-page` wrapper class is gone.

To replace `<StatsExport onCsvExport={a} onJsonExport={b} />`, pass one handler to
`<ExportButton onExport={(format) => (format === 'csv' ? a() : b())} />`. When it returns a promise, the button shows a spinner and
stays disabled until it settles; a rejection clears the spinner and is not rethrown, so report the failure inside the handler.
`hideLabel` has no equivalent. For `Separator`, use `Divider`, which wraps the same Radix root and adds dashed, dotted and label
variants.

`ChartWrapper` becomes the `ChartContainer` it was nested in: `isLoading` → `loading`, `customLoader` → `loader`,
`customNoDataMessage` → `emptyMessage` (a string or an element), and `empty={useChartDataCheck({ data, dataset })}` in place of its
`data` / `dataset` props. `useChartDataCheck` is still exported. `<SecondaryStatCard name value />` becomes
`<SingleStatCard variant="compact" name value />`, which renders the same tile.

The domain `Alert` type is renamed `AlertRecord`. It shared a name with the `Alert` component, so `import type { Alert }` from
the package root resolved to the component.

`SITE_OVERVIEW_STATUSES` is still exported by `@tetherto/mdk-ui-foundation`. The blueprints, the `./blueprints.json` export and
the UI registry's `dashboards` category are removed, and `react-selecto` is no longer a dependency.

### `@tetherto/mdk-react-adapter`

The package drops 335 exports: every data hook that called a `/auth/*` route no MDK backend serves (`list-things`,
`tail-log`, `history-log`, `actions`, `pools`, `miners`, `site`, `global`, `thing-*`, `featureConfig`, `userinfo`, ...), with
their option and result types, `poll-intervals`, `chart-points` and `hooks-types`, and `useActions`, the hook over the
removed actions store.

| Area                         | Removed                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Alerts and incidents         | `useActiveIncidents`, `useCurrentAlertDevices`, `useHistoricalAlerts`                           |
| Site and dashboard           | `useSite*`, `useSitesOverview*`, `useHashrateChartData`, `useConsumptionChartData`, `usePowerModeTimelineData`, `useDashboardDateRange`, `useDashboardTimeRange`, `useDashboardExport`, `useSystemInfo` |
| Pools and miners             | `usePools`, `usePoolRows`, `usePoolStats`, `usePoolConfigsData`, `usePoolBalanceHistory`, `usePoolManagerDashboard`, `useMiners`, `useMinerDevices` |
| Actions and comments         | `useDeviceAction`, `useSubmitSingleAction`, `useSubmitPendingActions`, `useVoteOnAction`, `useCancelAction`, `usePendingActions`, `useLiveActions`, `useThingComment`, `useCurrentUserEmail` |
| Devices and layouts          | `useExplorerList`, `useThingDetail`, `useCabinet*`, `useContainer*`, `usePduLayout`, `usePduViewer`, `useRackLayout`, `useFeatureFlags`, `useNominalConfig`, `useMinerDuplicateValidation`, `useStaticMinerIpAssignment` |

The store, permission, token, timezone, UI-utility and installed-app hooks stay, as do the TanStack Query re-exports. To
replace a removed hook, read the route your Gateway plugin serves with `useQuery`, shape it in `select`, and pass the result
to the devkit component as props; [`examples/mvp-site`](examples/mvp-site/README.md) does this for its `site` plugin.

### `@tetherto/mdk-ui-foundation`

The `./presets/mining` entry point is removed: the mining query factories (`siteQuery`, `tailLogQuery`, `listThingsQuery`,
`poolsQuery`, the action and thing-comment mutations, ...), the `queryKeys` registry, and the query dialect (op-center,
alert and dashboard builders, Mongo selector composers, container tab matrix, `flattenKernelEnvelope`). The 33 request and
response types for those routes leave the root and `./types` (`ListThingsParams`, `TailLogParams`, `SiteResponse`,
`PoolsResponse`, ...). `API_ENDPOINTS` keeps only the session routes (`auth`, `authToken`, `userInfo`).

| Before (`@tetherto/mdk-ui-foundation/presets/mining`)                                                              | Now                                         |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `gatewayRedirectAuth`, `GatewayRedirectAuthOptions`, `GATEWAY_REFRESH_INTERVAL_MS`, `authTokenMutation`            | `@tetherto/mdk-ui-foundation`               |
| `isMiner`, `isContainer`, `isAntminer`, `isAvalon`, `isWhatsminer`, `appendIdToTag(s)`, `appendContainerToTag`, `removeContainerPrefix` | `@tetherto/mdk-ui-foundation`               |
| `getTimelineOptions`, `DEFAULT_TIMELINE_OPTIONS`                                                                   | `@tetherto/mdk-react-devkit`                |

Change the import path for these; nothing else about them changes.

The root drops 62 more exports that only served the removed pages:

- `actionsStore`, `createActionsStore` and their types, the pending-action voting state (also leaving `./store`)
- the device-action builders (`buildSetPowerModeAction`, `buildRebootAction`, `buildSwitchSocketAction`, ...,
  `buildDeviceActionSubmission`), `DEVICE_ACTION`, `DEVICE_BATCH_ACTION`, `POWER_MODE` and `VOTING_SUBMISSION_TYPE`
- `fetchHistoricalAlertsInChunks`, `breakTimeIntoIntervals`, `mergeAlertsByUuid`, `getLatestSample` and
  `getSignInRedirectUrl`
- the pool, site-status, PDU-layout, live-action and voting types (`PoolsSummary`, `SiteStatusPower`, `PduLayoutItem`,
  `LiveAction`, `VotingActionPayload`, ...), also leaving `./types`, and `CONTAINER_TAB_LABEL`

A write command goes through your app's own Gateway route, which calls `sendCommand` on the Worker.

The "any backend" data layer goes with it: `createResourceQuery`, `createResourceMutation`, `resourceKey`, the endpoint
map (`API_ENDPOINTS`, `EndpointMap`, `getEndpoints`, `endpointUrl`), the URL helpers (`resolvePath`, `appendQuery`,
`buildUrl`, `createGetQueryFn`) and `applySession`. `createMdkQueryClient` and `MdkProvider` drop their `endpoints` and
`fetcher` options; the client always builds its auth-aware fetcher from `auth`, readable with `getFetcher(client)`.
Apps read their Gateway routes with `useQuery`.

### Examples and CLI

- `examples/full-site` and `examples/backend` are removed, and [`examples/mvp-site`](examples/mvp-site/README.md) is the
  runnable example
- The sample `@tetherto/mdk-worker-demo` is removed
- `mdk-crypto-lib` moves to `examples/mvp-site/lib/mdk-crypto-lib`, and the root `crypto-js` override points there
- The CLI's stub commands are removed: `mdk get`, `mdk describe`, `mdk logs`, `mdk discover`, `mdk mcp register` and
  `mdk manifest`. They did nothing, and `mdk status` reports component state.
- The shell template drops its `_managed/` reference pages (Dashboard, Alerts, Explorer, container detail, Pool Manager, Site
  Overview), and its dev server proxies `/site` to the Gateway

## Security

- **Stats keypaths** are parsed with a forbidden-segment list instead of `new Function`, and stats ops come from an allowlist
- **Device addresses**: remote `registerThing` and `updateThing` reject loopback, link-local, metadata, multicast and unspecified
  addresses (`ERR_THING_ADDRESS_FORBIDDEN`). `thing.allowedAddressCidrs` replaces that policy with an allowlist.
- **Secrets are redacted** from `thing_config`, `list`, `getDeviceMeta`, pool config and Kernel action records
- **Bounded reads**: log reads, pool database reads (10000 rows) and time ranges (9000 buckets, `ERR_TIME_RANGE_TOO_LARGE`) are
  capped
- **Kernel protocol**: payload sizes and `reqVotes` (1 to 10) are limited, a Worker may only write to devices it owns
  (`ERR_DEVICE_NOT_OWNED`), each `workerId` stays bound to the key that first registered it, and Worker errors that are not
  `ERR_*` codes are masked
- **Seed files** that are symlinks, owned by another user or malformed are refused instead of replaced
- **MCP server**: tools for `"auth": true` routes need an `identity` whose `perms` cover the route. Host and Origin are checked, an
  optional Bearer `token` guards `/mcp`, and tool output is wrapped and capped.
- **Dependencies**: a root `katex` 0.19.0 override clears GHSA-238p-pmpm-9mq7, the `@modelcontextprotocol/sdk` floor rises to
  `^1.32.1` (GHSA-6qxp-vccf-f47h), `hono` is declared at `^4.12.34` (GHSA-f23p-vx2j-j53r), and `source-map-js` is pinned at
  1.2.2 (GHSA-68fv-2mgg-jv7q) in every install root

## Fixed

- **`LineChart` draws data that is set before `lightweight-charts` loads.** The chart library loads lazily, and the effect that
  feeds the series ran before the series existed and never ran again, so data that does not change after mount (demo fixtures,
  a one-shot fetch) stayed blank until a timeline was picked. `LineChartCard` and every chart built on `LineChart` were affected.
- **`wrong_miner_pool`** compares each configured pool URL with the URL the miner reports at the same position. It used to fire
  whenever either list was empty, and never when both had pools.
- **Kernel registry**: an unchanged device list no longer rewrites the store, and a stale Worker can no longer unmap another
  Worker's device
- **`mdk status`** passes the Kernel key the client reads, and `mdk run --help` no longer lists `mcp` under `all`
- **The Gateway corestore** lives under the data root instead of the working directory, and `setup-config.sh` keeps existing
  configs unless `-f` is passed

## Dependencies

| Package                                                                | Change                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@tetherto/mdk-gateway`                                                | Adds `@fastify/helmet` 13.1.1, `@fastify/rate-limit` 11.2.0 and `@tetherto/mdk-app-runtime`. Drops `@tetherto/mdk-plugins` and `@tetherto/mdk-worker`. |
| `@tetherto/mdk-mcp`                                                    | `@modelcontextprotocol/sdk` `^1.30.0` to `^1.32.1`. Adds `hono`, `@hono/node-server` and `@tetherto/mdk-app-runtime`. |
| `@tetherto/mdk-agent`                                                  | `@modelcontextprotocol/sdk` `^1.30.0` to `^1.32.1`                                          |
| `@tetherto/mdk-client`, `@tetherto/mdk-kernel`, `@tetherto/mdk-worker` | `hyperdht` pinned at 6.34.1 across the workspace                                            |
| `@tetherto/mdk-react-devkit`                                           | Drops `react-selecto`                                                                       |
| Root                                                                   | Overrides add `hyperdht` 6.34.1, `katex` 0.19.0 and `source-map-js` 1.2.2, and move `smol-toml` from 1.9.0 to 1.9.1 |

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
