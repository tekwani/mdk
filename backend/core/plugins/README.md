---
todo: "see docs/reference/maintainers/ia.md — check:plugin-reference-fresh and check:plugin-manifest"
---

# @tetherto/mdk-plugins

Default [Gateway](../gateway/README.md) plugins and the declarative plugin format for extending the MDK Gateway with 
custom HTTP routes.

## Overview

A plugin is a directory containing:

- `mdk-plugin.json`: manifest declaring route identity, HTTP surface, and caching
- One or more controller files — each exports `async function (req, services)`

The Gateway registers `telemetry`, `site-hashrate`, and `site-monitor` automatically, and accepts additional plugin directories via 
`startGateway({ extraPluginDirs: [...] })`. The `auth` plugin ships here but is [neither registered nor wired](#the-bundled-auth-plugin).

> [!TIP]
> New to the plugin system? Read the [Gateway plugins how-to guide](../../../docs/guides/gateway/plugins.md) for a step-by-step walkthrough.
> For the broader toolkit context, see the [MDK App Toolkit concept page](../../../docs/concepts/stack/app-toolkit.md).

## Manifest format

Read a real manifest rather than a field table — every supported field is exercised across the shipping manifests, and they are validated at startup 
so they cannot drift:

- [telemetry manifest](telemetry/mdk-plugin.json): `cache`, query `parameters`, `responses`, `constraints`, `errors`, and
named-export handlers (`./controllers/power-mode.js#timeline`)
- [site-plugin manifest](../../../examples/full-site/plugins/site/mdk-plugin.json): a `POST` with a `requestBody`, path
`parameters`, and `safety`

What is required and what is rejected is defined by `_validateManifest` in [`plugin-loader.js`](../gateway/workers/lib/plugin-loader.js): `name`, 
`version`, and a non-empty `routes` array, plus per route an `id`, a `handler`, an allowed `http.method` (`GET`/`POST`/`PUT`/`DELETE`/`PATCH`), an 
`http.path`, and unique route ids. Path parameters in `{param}` form are normalized to Fastify's `:param`.

Beyond the validated fields, two are read:

- `cache` is enforced: an array of dot-paths composed into the cache key by [`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js). Pass 
`?overwriteCache=true` to bypass
- `description` is read by [`generate-plugin-reference.js`](../../../docs/scripts/generate-plugin-reference.js) to build the route tables

The following have no reader:

- `constraints`, `errors`, and `safety` record intent for humans and agents reading the manifest
- [`auth` and `permissions`](../../../docs/guides/gateway/plugins.md#auth-and-permissions) may be used to document what a route expects, 
and pair each declaration with the matching check in the controller that serves it

## Controllers

A controller exports `async function (req, services)` and returns a value that is serialized as a `200` JSON response. Use `"handler": 
"./file.js#namedExport"` for a non-default export. Any shipping controller shows the shape — for example,
[`hashrate.js`](telemetry/controllers/hashrate.js).

- `req` (`params`, `query`, `body`, `headers`, `_info`) is assembled in [`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js)
- `services` (`mdkClient`, `dataProxy`, `conf`) is defined by the `_pluginServices` getter in 
[`http.node.wrk.js`](../gateway/workers/http.node.wrk.js) — guard `services.mdkClient`, which is `null` when Kernel is not connected

The [plugin authoring guide](../../../docs/guides/gateway/plugins.md) walks through building a controller, including when to use `mdkClient` 
versus `dataProxy`.

## Default plugins

These plugins ship with MDK. `telemetry`, `site-hashrate`, and `site-monitor` are registered on Gateway startup by 
[`http.node.wrk.js`](../gateway/workers/http.node.wrk.js); `auth` is not, and mounting it needs work first 
([the bundled auth plugin](#the-bundled-auth-plugin)).

The tables are generated from every `mdk-plugin.json` in this directory by 
[`docs/scripts/generate-plugin-reference.js`](../../../docs/scripts/generate-plugin-reference.js), so they cover the shipped plugins only. Routes you 
add through `extraPluginDirs` are owned by their own manifests and are not listed here.

Every route is served without authentication. The Gateway applies no token check of its own, so protecting a route is controller work 
([auth and permissions](../../../docs/guides/gateway/plugins.md#auth-and-permissions)).

<!-- BEGIN GENERATED: default-plugins. DO NOT EDIT. Regenerate with `npm run generate:plugin-reference`. Source: backend/core/plugins/*/mdk-plugin.json -->

### `auth`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/auth/userinfo` | Returns the authenticated user's profile from the validated JWT |
| `POST` | `/auth/token` | Issues a new JWT from an existing valid token, optionally scoping TTL and roles |
| `GET` | `/auth/permissions` | Returns the permission set encoded in the current token |
| `GET` | `/auth/ext-data` | Proxies an external data request to the Kernel network by type and optional query filter |

### `site-hashrate`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/site/hashrate-history` | Fans out telemetry.pull to every registered worker and returns site-level hashrate history aggregated by timestamp. Defaults to last 7 days when start/end are omitted |

### `site-monitor`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/auth/site` | Returns the site name from the gateway config (common.json `site`) |
| `GET` | `/auth/featureConfig` | Returns the featureConfig object from the gateway config (common.json `featureConfig`) |
| `GET` | `/site-monitor/hashrate` | Pulls metrics telemetry from every READY worker's devices via the MDK protocol and returns per-device hashrate/power plus site totals |

### `telemetry`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/auth/metrics/hashrate` | Returns daily hashrate history and summary for the site. Optionally groups by miner type or container |
| `GET` | `/auth/metrics/consumption` | Returns daily power consumption (W and MWh) history and summary for the site |
| `GET` | `/auth/metrics/efficiency` | Returns daily mining efficiency (W/TH) history and summary for the site |
| `GET` | `/auth/metrics/miner-status` | Returns daily online/offline/sleep/maintenance miner counts and averages |
| `GET` | `/auth/metrics/power-mode` | Returns miner count by power mode category (low/normal/high/sleep/offline) over time |
| `GET` | `/auth/metrics/power-mode/timeline` | Returns per-miner power mode segments over a time range, optionally filtered by container |
| `GET` | `/auth/metrics/temperature` | Returns max and average temperature per container over time, with site-level aggregates |
| `GET` | `/auth/metrics/containers/{id}` | Returns latest telemetry snapshot and miner list for a specific container |
| `GET` | `/auth/metrics/containers/{id}/history` | Returns historical telemetry log for a specific container |

<!-- END GENERATED: default-plugins -->

### The bundled auth plugin

`auth` ships in this package for reference. Adding its directory to `extraPluginDirs` mounts the routes but does not give you working endpoints:

- [`auth/controllers/permissions.js`](auth/controllers/permissions.js) and [`auth/controllers/token.js`](auth/controllers/token.js) call 
`ctx.authLib`, which the services bag does not carry. The `_pluginServices` getter in 
[`http.node.wrk.js`](../gateway/workers/http.node.wrk.js) exposes `mdkClient`, `dataProxy`, and `conf`, so both controllers throw a `TypeError` that 
the worker's `onError` hook returns as HTTP 400
- [`auth/controllers/userinfo.js`](auth/controllers/userinfo.js) returns `req._info.user`. Nothing populates `_info`, which 
[`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js) defaults to `{}`, so the route answers with an empty body
- [`auth/controllers/ext-data.js`](auth/controllers/ext-data.js) is the exception: it uses `dataProxy` and works once mounted

Authentication is yours to supply. Bring an identity layer and implement the checks your routes need inside their controllers 
([auth and permissions](../../../docs/guides/gateway/plugins.md#auth-and-permissions)).

## Mounting plugins

```js
const { startGateway } = require('@tetherto/mdk')

await startGateway({
  kernel,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/my-metrics')
  ]
})
```

The loader validates every manifest and handler at startup and throws an `ERR_PLUGIN_*` error on the first problem — a missing or unparsable manifest, 
a missing required field, a duplicate route `id`, a handler file that can't be found, or a handler that isn't a function. The codes and the 
checks behind them live in [`plugin-loader.js`](../gateway/workers/lib/plugin-loader.js).

## Directory layout

```
plugins/
├── auth/
│   ├── mdk-plugin.json
│   └── controllers/
│       ├── userinfo.js
│       ├── token.js
│       ├── permissions.js
│       └── ext-data.js
├── telemetry/
│   ├── mdk-plugin.json
│   └── controllers/
│       ├── hashrate.js
│       ├── consumption.js
│       ├── efficiency.js
│       ├── miner-status.js
│       ├── power-mode.js
│       ├── temperature.js
│       └── containers.js
├── site-hashrate/
│   ├── mdk-plugin.json
│   └── controllers/
│       └── hashrate-history.js
├── site-monitor/
│   ├── mdk-plugin.json
│   └── controllers/
│       ├── site.js
│       ├── feature-config.js
│       └── hashrate.js
├── lib/
│   ├── constants.js
│   ├── metrics.utils.js
│   ├── period.utils.js
│   └── utils.js
└── package.json
```

## Regenerating the default-plugin tables

The default-plugin route tables under [Default plugins](#default-plugins) are generated from the manifests. Regenerate and commit them 
whenever a default plugin's routes change:

```bash
cd backend/core/plugins
npm run generate:plugin-reference
```

## Next steps

- [Build your first plugin](../../../docs/guides/gateway/plugins.md)
- See a working [`extraPluginDirs` setup](../../../examples/full-site/README.md)
- Review the [Gateway's extension model, data access, and auth design](../../../docs/concepts/stack/gateway.md)
- [Understand where plugins fit in the stack](../../../docs/concepts/stack/app-toolkit.md)
- See all [`startGateway()` options](../mdk/README.md)
