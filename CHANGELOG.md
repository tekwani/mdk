# Changelog: mdk-0.6.0

> For a high-level introduction, see the [release notes](./docs/reference/release-notes/0.6.0-release.md).

## v0.6.0

- Reduces the **Gateway to a thin plugin host**: The entire built-in HTTP API (auth/OAuth2, WebSocket, alerts, users, audit log, and ~20 route/handler/schema modules) is deleted, and routes now come only from plugins (breaking)
- Replaces the mock-control-service package with **`@tetherto/mdk-mcp`**, an MCP server that exposes MDK data to agents as declarative tools (breaking)
- Ships **`@tetherto/mdk-skill`**, an Agent Skills bundle versioned against the MDK release line
- Turns the UI shell template into a **runnable example** and slims `mdk-ui create` to a bare backbone whose feature pages are added on demand (breaking)
- Consolidates the examples around a new **`examples/mvp-site`** single-container site, and makes the repo root an **npm workspaces** monorepo
- Adds **versioned Whatsminer API protocol handlers** (v2/v3) and a `site-monitor` Gateway plugin
- Moves every UI surface from the discontinued `react-router-dom` shim to **`react-router` v8**, clearing a high-severity advisory that no override could resolve (breaking for scaffolded apps)

## Breaking changes

### Gateway reduced to a plugin host — built-in HTTP API removed

`@tetherto/mdk-gateway` no longer ships an application API of its own. Every route module, handler, schema, and supporting library behind the old `workers/lib/server/` tree is deleted; the worker now boots the httpd facility, registers plugins, and serves whatever those plugins declare. What went away:

| Area | Removed |
|---|---|
| Auth / identity | `lib/auth.js`, `lib/users.js`, `lib/server/lib/authCheck.js`, `capCheck.js`, the `svc-facs-auth` + two `svc-facs-httpd-oauth2` facilities, the `auth` sqlite facility, and the periodic `cleanupTokens` interval |
| Realtime | `@fastify/websocket` registration, `routes/ws.routes.js`, `lib/alerts.js` and the 5-second `broadcastAlerts` loop |
| Data / state | `lib/globalData.js` and the `global-data` hyperbee, `lib/dcs.utils.js`, `lib/metrics.utils.js`, `lib/period.utils.js`, `lib/server/lib/queryUtils.js`, `routeHelpers.js` |
| Audit | `lib/server/lib/auditLogger.js` and the optional `audit.logger.json` config |
| Routes / handlers | `actions`, `alerts`, `auth`, `configs`, `coolingSystem`, `devices`, `energySystem`, `explorer`, `finance`, `global`, `groups`, `logs`, `metrics`, `miners`, `pools`, `settings`, `site`, `site-monitor`, `things`, `users`, `ws` — plus every `schemas/*.js` |

The `_pluginServices` object handed to plugins lost `authLib`; it now exposes only `dataProxy`, `mdkClient`, and `conf`. The example config files `config/facs/auth.config.json.example`, `config/facs/httpd-oauth2.config.json.example`, and `config/audit.logger.json.example` are gone.

Dependencies dropped from the package: `@fastify/websocket`, `@bitfinex/bfx-facs-db-sqlite`, `@bitfinex/bfx-facs-http`, `@bitfinex/bfx-facs-interval`, `@bitfinex/lib-js-util-base`, `@tetherto/hp-svc-facs-store`, `@tetherto/svc-facs-auth`, `@tetherto/svc-facs-httpd-oauth2`, `mingo`, and the `@tetherto/mdk` self-dependency. `@tetherto/svc-facs-httpd` moved **v1.0.0 → v2.0.0**.

**Action required**: anything that called a built-in Gateway endpoint must now supply it as a plugin. The three default plugins the worker registers are `telemetry`, `site-hashrate`, and the new `site-monitor`; register your own with `extraPluginDirs`.

**Note on `@tetherto/mdk-plugin-auth`**: the plugin still ships inside `@tetherto/mdk-plugins`, but the Gateway no longer auto-registers it, and its `permissions`/`token` controllers read `services.authLib` — which the Gateway no longer provides. Treat the bundled auth plugin as unwired in 0.6.0 and bring your own identity layer.

### `startGateway()` auth options removed

In `@tetherto/mdk`, the Gateway bootstrap no longer knows about authentication:

- `opts.noAuth`, `opts.auth`, and `opts.httpdOauth2` are **removed** (as is the internal no-auth OAuth2 stub used to satisfy facility validation)
- `auth.config.json` and `httpd-oauth2.config.json` are no longer materialised into the run directory — the config mapping is now just `httpd`, `net`, `store`, and `logging`
- `ctx.noauth` is no longer set on the worker context

`startKernel()` is now a thin alias for `getKernel()` rather than a second, divergent bootstrap path.

### `@tetherto/mdk-mock-control-service` removed

The standalone mock-control-service package is gone. Its `mock-control-agent.js` now lives in `@tetherto/mdk-worker-mock` (`backend/workers/mock/mock-control-agent.js`), and the nine per-worker `mock/mock-control-agent.js` copies (antspace, bitdeer, f2pool, antminer, avalon, whatsminer, abb, satec, schneider, seneca) were deleted in favour of that single shared implementation. The package's `routes.js` and its HTTP agent integration test were dropped with it.

**Action required**: import the mock control agent from `@tetherto/mdk-worker-mock` and drop any dependency on `@tetherto/mdk-mock-control-service`.

### UI shell template moved out of the CLI and slimmed to a backbone

The `mdk-ui-shell` template is no longer a scaffold-only tree inside `@tetherto/mdk-ui-cli`. It now lives at **`examples/mdk-ui-shell-template/`** as a real Vite app you can `npm run dev` in place, and the CLI's build step copies it into `dist/templates/mdk-ui-shell-template` (filtering local artifacts like `node_modules`, `dist`, `.env`, `package-lock.json`, and renaming `.gitignore` → `_gitignore`, which `create` restores at scaffold time).

`mdk-ui create` now produces a **bare backbone** — Google OAuth sign-in, the token lifecycle, and the app frame (header, user menu, sidebar) around a Home landing page — with no feature pages. The reference pages (Dashboard, Alerts, Pool Manager, Explorer, Site Overview) ship in the template under `_managed/pages/`, which `create` strips; they are restored individually with `mdk-ui add page <Name>`.

Template resolution changed from filesystem discovery to an explicit registry, because templates now span two source roots (the runnable `examples/` app and the bundled `packages/cli/templates/starter` scaffold) that only reunite under `dist/templates/` once published.

**Action required**: expect a scaffolded app to contain no feature pages; add the ones you want with `mdk-ui add page`. Anyone reading templates out of the CLI package tree should read `dist/templates/<id>` instead.

### Examples restructured

- **`examples/e2e/` removed** — its UI became `examples/mvp-site/ui/`
- **`examples/site-backend/` removed** — its site Gateway plugin became `examples/mvp-site/backend/gateway-plugins/site/` (controllers `command`, `history`, `overview`, plus `utils`)
- **`examples/backend/` de-packaged** — every nested `package.json` under it is gone (containers, minerpools, miners, powermeters, sensors, site, site-single-process, mdk-e2e, mdk-plugin-e2e), taking the tree from 131 to 57 tracked files. The remaining examples are plain scripts run from the parent rather than installable packages, and the per-family device scripts were folded into per-vendor entry points (e.g. `containers/mdk.client.container.js` → `containers/antspace/index.js`, `miners/mdk.client.miner.js` → `miners/whatsminer/index.js`).

## Added

### `@tetherto/mdk-mcp` — MCP server

New package at `backend/core/mcp/` exposing MDK data to agents over the Model Context Protocol.

| Piece | Description |
|---|---|
| `createMcpServer(root, port, client, pluginDirs)` (`server.js`) | Starts a `StreamableHTTPServerTransport` MCP server on `127.0.0.1:<port>`, answering `POST /mcp` only; validates `root`/`port` with `ERR_INVALID_MCP_ROOT` / `ERR_INVALID_MCP_PORT`, and installs SIGINT/SIGTERM shutdown that closes the MDK client first |
| `loadPlugin` (`lib/plugin-loader.js`) | Loads `mcp-plugin.json` manifests and returns their `tools[]`; each tool declares `id`, `description`, `handler`, and an optional JSON-Schema `schema` that the SDK enforces before dispatch |
| Tool handlers | Invoked as `(args, services)` with `services.mdkClient`, so a tool reaches the fleet through the ordinary MDK protocol client |

A fresh server instance is constructed per request (stateless transport, no session id). Dependencies: `@modelcontextprotocol/sdk` ^1.29.0, `async` 3.2.6, `debug` 4.4.1. `examples/full-site/` gained an `mcp-client.js` driver alongside its updated `docs/mcp-server.md`.

### `@tetherto/mdk-skill` — MDK Developer Skill Suite

New package at `packages/mdk-skill/` — an Agent Skills (`SKILL.md`) bundle assembled from the monorepo's real artifacts and versioned to track the MDK release line. It is a copy-only assembler: each library owns its artifacts, and this package curates them into `dist/skills/` and installs them flat into `.cursor/skills/` or `.claude/skills/` (`npm run install:skills`; `assemble` also runs on `prepack`).

Five skills ship: `mdk` (with `architecture`, `glossary`, `package-index`, and `protocol` references), `mdk-device-worker` (contract-authoring, device-families, local-testing and worker-base-api references, an `mdk-contract.template.json` asset, plus `validate-contract.mjs` and `worker-smoke.mjs` scripts), `mdk-app-plugin`, `mdk-deployment`, and `mdk-ui-component`. A top-level `mdk-contract.schema.json` and a `sources.map.json` describing the copy graph are included.

### `site-monitor` Gateway plugin

New built-in plugin (`backend/core/plugins/site-monitor/`) — "site identity, feature configuration, and live per-device hashrate via the MDK protocol client" — registered by default alongside `telemetry` and `site-hashrate`.

| Route | Method + path | Description |
|---|---|---|
| `site.info` | `GET /auth/site` | Site name from the Gateway config (`common.json` `site`) |
| `site.feature-config` | `GET /auth/featureConfig` | The `featureConfig` object from the Gateway config |
| `site.hashrate` | `GET /site-monitor/hashrate` | Live per-device hashrate and power with site totals |

All three are declared `auth: false` and `safety: "read-only"`.

### Whatsminer versioned API protocol handlers

`@tetherto/mdk-worker-whatsminer` gained a protocol layer at `lib/protocols/` that adapts to the device's API generation instead of assuming one wire format.

- `ApiHandlerFactory` resolves a handler from any version string by **major** version (`'2.2.2'` → the v2 handler), with `normalizeVersion`, `getSupportedVersions`, `getHandlerClass`, `getDefaultPort`, and `isVersionSupported` helpers; an unknown major throws `ERR_UNSUPPORTED_API_VERSION`.
- Two handlers over a shared `wm-api-base`: **v2** (canonical `2.0.5`, port `4028`, auth command `get_token`) and **v3** (canonical `3.0.3`, port `4433`, auth command `get.device.info`), with a `COMMAND_MAP_V3` translating v2 underscore commands to v3 dot notation. v2 remains the default.
- Five new unit suites cover the factory, constants, base handler, and both version handlers

### UI — container detail, system info, and clickable table rows

- **`ContainerDetail`** (`@tetherto/mdk-react-devkit`, `domain/features/container-detail/`) — the presentational page shell every container tab mounts into: a back link, the container name, and a per-model tab strip. The page owns routing and the active tab and supplies the body as `children`; a `ContainerDetailPlaceholder` covers not-yet-built tabs. Exported from `domain/features`, with `USAGE.md`, an example, and specs. A matching `container-detail-page.tsx` was added to the catalog app.
- **`useSystemInfo`** (`@tetherto/mdk-react-adapter`) — composes `GET /auth/site`, `GET /auth/userinfo`, and `GET /auth/featureConfig` into one page-ready `SystemInfo` payload (`site`, `email`, `roles`, `featureCount`) with a single `refetch`. Exported with its `SystemInfo` and `UseSystemInfoResult` types.
- **`DataTable` row clicks** — new `onRowClick` on the `DataTable` primitive, threaded through `DeviceExplorer` and `DeviceExplorerTable`. Rows become `role="button"`, focusable, and activatable with Enter/Space; clicks originating inside a `button`, `a`, `input`, `label`, `[role="checkbox"]`, or anything marked `data-no-row-click` are ignored, so selection checkboxes and expand toggles keep working.
- **Hashrate helpers** — `getHashrateString` and `getHashrateUnit` are now exported from the devkit `domain` entry point
- **Header stat boxes** — `HeaderHashrateBox` gained `fractionDigits` prop (default `3`) for controlling decimal precision.

### `examples/mvp-site`

A new minimal single-container site demo: Kernel, Gateway, a Whatsminer worker, an Ocean pool worker, a SATEC powermeter worker, and the MDK React UI, with an MCP server via `@tetherto/mdk-mcp`. Devices are seeded from a gitignored `config/devices.json` (keyed by `miners` / `powermeters`, copied from the checked-in `.example`), each mock device getting its own port. Ships PM2 deployment under `deploy/`, a `setup-config.js` generator, `start.js`, unit tests, and its own UI workspace with pool setup, dynamic hashrate units, and site hashrate history.

### Documentation

- **Container worker guides** (new): `docs/guides/containers/index.md`, `run-antspace-worker.md`, and `run-bitdeer-worker.md`
- **New reference pages**: `docs/reference/kernel/modules.md` and `docs/reference/protocol/messages.md`
- Refreshed worker/deployment/gateway guides, the get-started and quickstart tutorials, `docs/concepts/security-boundaries.md`, `docs/concepts/stack/workers.md`, and the glossary to match the plugin-host Gateway and the new example layout

### CI / tooling

- **`.github/scripts/workspace-context.sh`** resolves, per package directory, whether the authoritative install is a single root `npm ci` (workspace member) or an in-place install (standalone package such as `ui`, `backend/core/plugins`, or the example UIs), and prints the install dir, cache slug, and `node_modules` path the cache actions consume. Members share one `workspace-root` cache slug keyed on the root lockfile, which fixes members failing to link dev bins (e.g. `standard`) under a partial single-workspace install.
- **`.github/actions/test-with-coverage`** (new) enforces the ≥80% per-package coverage gate; the `mdk` package is sharded across parallel runners (fast unit vs. the slow actions-flow integration suites) with a `coverage-mdk` job merging shard coverage before gating.
- Changes under `.github/scripts/` are now classified as CI-infra and run every suite

## Changed

- **The repo root is now an npm workspaces monorepo.** Root `package.json` declares 21 workspace members — `backend/core/{client,gateway,kernel,mdk,mdk-worker,mcp,plugins}`, every `backend/workers/*` package, and `examples/mvp-site` — plus a root `overrides` block. `ui/`, `backend/core/plugins`, and the example UI apps stay standalone. Install workspace members with one `npm ci` at the root, not per package.
- **Gateway internal dependencies moved from `file:` links to registry ranges** — `@tetherto/mdk-client` and `@tetherto/mdk-plugins` are now `^0.6.0` rather than `file:../client` / `file:../plugins`. `examples/mvp-site` likewise consumes `@tetherto/mdk-*` at `^0.6.0`.
- **Managed pages gained Dashboard and hidden-page support.** `Dashboard` (hashrate + consumption charts, active incidents, mining pools) is now a managed page restorable with `mdk-ui add page Dashboard`. `navIcon`/`navEntry` became optional so deep-link-only pages can be managed without a sidebar entry, and `add`/`remove page` skip nav patching for them.
- **Mock initial states and utilities reworked** across antspace (default + immersion), bitdeer (D40), f2pool, ocean, whatsminer (M56S), and the shared `base.mock.js`, with new unit suites for `base.mock`, device mocks, miner mocks, and a `cli-mock` fixture set
- **Dependency bumps**: `fastify` 5.8.5 → 5.10.0 and `@fastify/static` 9.1.3 → 10.1.2 (Gateway + root overrides); `@tetherto/svc-facs-httpd` v1.0.0 → v2.0.0; `aedes` 1.0.2 → 1.1.1; `mingo` 6.4.6 → 6.4.15; `svgo` ^3.0.0 → ^3.3.4. The router move is covered under Security — `react-router-dom` is replaced outright, not bumped.
- **Doc generators now extract TypeScript types** via a shared `ui/scripts/ts-morph-utils.mts`, used by the react-adapter hook generator, the devkit registry generator and its `registry-types`, and the ui-foundation store generator
- All package versions across `backend/core`, `backend/workers`, `ui/`, `examples/`, and `packages/mdk-skill` are synced to **`0.6.0`**, including `examples/mdk-ui-shell-template`, which moves off its `0.0.0` scaffold default onto the shared release line

## Removed

- The Gateway's entire built-in HTTP API surface — see Breaking changes for the module-by-module list, plus the `ws` integration test and the ~40 unit suites covering the deleted routes, handlers, and libraries
- **`@tetherto/mdk-mock-control-service`**, and the nine duplicated per-worker `mock/mock-control-agent.js` copies
- **`examples/e2e/`** and **`examples/site-backend/`**, and every nested `package.json` under `examples/backend/`
- The **`mdk-ui-shell` template tree** inside `@tetherto/mdk-ui-cli` (relocated to `examples/mdk-ui-shell-template/`), including the template's `_meta.json` and its `constants/dashboard.ts` / `constants/routes.ts`
- The **`generate:shell`** script from `ui/package.json`, and the `!apps/mdk-ui-shell` workspace exclusion — the shell is no longer generated into `ui/apps/`
- The Gateway's **`test:ws`** npm script

## Security

### UI — Header stat box prop renames

**`HeaderHashrateBox` and `HeaderMinersBox` props renamed** from MOS terminology to App terminology:

- `HeaderHashrateBox`:
  - `mosPhs` → `appPhs`
  - `mosLabel` → `appLabel` (default changed from `'MOS'` to `'APP'`)
  
- `HeaderMinersBox`:
  - `mosTotal` → `appTotal`  
  - `mosLabel` → `appLabel` (default changed from `'MOS'` to `'APP'`)

**Action required**: Update all `HeaderHashrateBox` and `HeaderMinersBox` usage to use the new prop names. The functionality is identical; only the prop names have changed.

**Migration example**:
```tsx
// Before (0.5.x)
<HeaderHashrateBox mosPhs={1234.5} mosLabel="MOS" />
<HeaderMinersBox mosTotal={50} mosLabel="MOS" />

// After (0.6.0)
<HeaderHashrateBox appPhs={1234.5} appLabel="APP" />
<HeaderMinersBox appTotal={50} appLabel="APP" />
```

### `react-router-dom` replaced by `react-router` v8 (breaking for scaffolded apps)

`react-router-dom@7` is affected by GHSA-qwww-vcr4-c8h2 (high), and the fix exists only in `react-router@8.3.0` — a release that discontinued the `react-router-dom` package entirely (its last version, `7.18.1`, hard-pins `react-router: 7.18.1`, so no override can resolve it). Every UI surface therefore moved off the shim:

| Package | Before | After |
|---|---|---|
| `ui/apps/catalog` | `react-router-dom@^7.13.0` | `react-router@^8.3.0` |
| `examples/mdk-ui-shell-template` | `react-router-dom@^7.13.0` | `react-router@^8.3.0` |
| `examples/mvp-site/ui` | `react-router-dom@^7.18.1` | `react-router@^8.3.0` |
| `examples/full-site/ui` | `react-router-dom@^7.18.1` | `react-router@^8.3.0` |

26 files changed their import specifier from `react-router-dom` to `react-router`; no router API changed, since v7's `react-router-dom` was already a re-export of `react-router` and every symbol in use (`createBrowserRouter`, `RouterProvider`, `HashRouter`, `Navigate`, `Route`, `Routes`, `Link`, `Outlet`, `useNavigate`, `useParams`, `useSearchParams`, `useLocation`) is exported unchanged by 8.3.0.

**Action required** for anyone with an app scaffolded from an earlier shell template: replace the `react-router-dom` dependency with `react-router@^8.3.0` and rewrite the import specifier. Note `react-router@8` raises its peers to `react`/`react-dom` `>= 19.2.7` and `engines.node` to `>= 22.22.0`.

**Not affected**: `@tetherto/mdk-react-devkit`, `@tetherto/mdk-react-adapter`, and `@tetherto/mdk-ui-foundation` declare no router dependency — `RequireAuth` is router-agnostic by design. The bundled `templates/starter` scaffold stays on `react-router-dom@^6`, which neither advisory affects.

### Dependency overrides and bumps

- `ajv` `8.17.1` → **`8.20.0`** in `backend/workers` (direct devDependency), clearing GHSA-2g4f-4pwh-qvx6 (ReDoS via the `$data` option; affected `>= 7.0.0-alpha.0, < 8.18.0`).
- `brace-expansion` forced to **`>= 5.0.8`** (GHSA-mh99-v99m-4gvg, DoS via unbounded expansion; the advisory marks every version `<= 5.0.7` vulnerable) via `overrides` in the repo root, `ui/`, `backend/core`, `backend/workers`, `examples/full-site`, and `examples/mdk-ui-shell-template`. This clears it wherever a modern `glob`/`minimatch` is present. It remains reachable through the dev-only `standard` → eslint@8 → minimatch@3 chain, which accepts only `brace-expansion@^1.1.7` and for which upstream published no patched 1.x — documented against the `audit-ci` allowlist entry rather than silently suppressed.
- Removed a dead `@isaacs/brace-expansion` override pinned to `5.0.5`, **a version that was never published** (only 5.0.0 and 5.0.1 exist). It appeared in no lockfile, so it never resolved — but it would have failed any install that needed the package.

The remaining advisory-clearing overrides, in `ui/package.json` and the root `overrides` block:

| Override | Resolution |
|---|---|
| `brace-expansion` (`>=1.0.0 <1.1.13`, `>=2.0.0 <2.0.3`, `>=5.0.0 <5.0.7`) | all pinned to `>=5.0.7` |
| `immutable` (`>=5.0.0 <5.1.8`) | `>=5.1.8` |
| `js-yaml` (`>=4.0.0 <4.3.0`) | `>=4.3.0 <5.0.0` |
| `linkify-it` (`<=5.0.1`) | `>=5.0.2 <6.0.0` |
| `shell-quote` (`<1.9.0`) | `>=1.9.0` |
| `ws` (`>=8.0.0 <=8.20.0`) | `>=8.20.1` |
| `@hono/node-server` | `2.0.12` |
| `svgo` | `^3.3.4` |

One advisory was added to the `audit-ci` allowlist (`.github/scripts/audit-ci.jsonc`): `GHSA-mh99-v99m-4gvg`, with an inline rationale recording why no override or upgrade can reach it and what removing it would take. `GHSA-qwww-vcr4-c8h2` is **not** allowlisted — it is fixed outright by the `react-router` v8 move above.

## Fixed

- **Device actions were rejected with a 400.** `toVotingPayload` posted the staged `tags` and `crossThing` fields, which the `POST /auth/actions/voting` body schema does not recognise, and sent no `query` — so every device-targeted action failed its `required: ['query','action','params']` check. Targeting now reaches the backend solely through `query`, built from the staged tags as `{ tags: { $in: tags } }`; an action can opt out with `overrideQuery: false` to submit an explicit `query` as-is (pool assignment targets by device id, not tags). `PendingSubmissionAction` gained typed `overrideQuery` and `crossThing` fields documenting that both are client-only queue metadata and never posted.
- **One bad pool account no longer breaks the whole Ocean stats cycle.** Unknown or inactive accounts return an error body with no `result`; `fetchStats` now wraps each account's earnings/hashrate/balance reads, raises `ERR_ACCOUNT_DATA_MISSING` when earnings or hashrate are absent, logs `ERR_STATS_FETCH <username>`, and continues to the next account instead of failing the entire fetch.

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
