---
title: Gateway plugins
description: Use the default Gateway plugins, mount third-party plugins, and build your own using the mdk-plugin.json format
docs@tether_slug: guides/gateway/plugins
---

## Overview

The Gateway exposes HTTP routes through a declarative plugin system. Each plugin is a directory containing an
[`mdk-plugin.json`][plugins-manifest] manifest and one or more controller files. MDK ships a set of default plugins that load automatically; 
you can mount additional plugins for your own site logic.

> [!NOTE]
> Plugins call into the Kernel through `services.mdkClient`, an instance of [`@tetherto/mdk-client`][mdk-client-readme]. No knowledge of the MDK Protocol envelope or internal message shapes is required.

## Default plugins

MDK ships plugins that load automatically on Gateway startup:

- The `telemetry` plugin serves site metrics (hashrate, consumption, efficiency, temperature, and more)
- The `site-hashrate` plugin serves aggregated site hashrate history
- The `site-monitor` plugin serves site configuration, feature flags, and live per-device hashrate

> [!IMPORTANT]
> The [`auth` plugin][auth-plugin-readme] (`@tetherto/mdk-plugin-auth`) ships in the same package but is not among them, and mounting it via
> `extraPluginDirs` does not give you working identity endpoints: its controllers depend on a `services.authLib` and a populated `req._info` that the
> Gateway does not provide. Supply your own identity layer.

The [plugin reference][plugins-readme] lists every route each of these plugins serves, with its method, generated from the plugin's
`mdk-plugin.json`. Plugins you mount yourself are documented by their own manifests.

<Steps>

<Step>

### Mount a plugin

Pass an `extraPluginDirs` array to `startGateway()` to load additional plugins at boot alongside the default plugins:

```js
const { startGateway } = require('@tetherto/mdk')

await startGateway({
  kernel,
  port: 3000,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/custom-metrics'),
    path.join(__dirname, 'plugins/alerts')
  ]
})
```

Each entry must be an absolute path to a directory containing an [`mdk-plugin.json`][plugins-manifest]. The plugin loader validates the
manifest and all handler files at startup — missing files or invalid manifests throw immediately before the server comes up.

</Step>

<Step>

### Build a plugin

A plugin is a directory with two things: a manifest and controllers.

#### 1.1 Create the manifest

[`mdk-plugin.json`][plugins-manifest] declares the plugin identity (`name`, `version`) and a `routes` array. Each route needs an `id`, a `handler` path, and an `http` 
block with a `method` and `path`. Rather than copy a synthetic example, start from a real manifest and trim it:

- [`examples/backend/mdk-plugin-e2e/gateway-plugin/mdk-plugin.json`][e2e-manifest]: one route, fully annotated with a response
schema, `constraints`, `errors`, and `safety`. The easiest starting point, and [seeing a plugin serve your data][serve-an-endpoint]
runs it end to end
- [`examples/full-site/plugins/site/mdk-plugin.json`][full-site-manifest]: three routes including a `GET`, a `POST` with a
`requestBody`, and path parameters
- [`backend/core/plugins/telemetry/mdk-plugin.json`][telemetry-manifest]: auth, caching, query parameters, and named-export handlers

Path parameters use `{param}` syntax — the loader normalises them to Fastify's `:param` format. For named exports use `"handler": 
"./controllers/foo.js#namedExport"`. The [plugin reference][plugins-readme] explains what each field means and what the loader requires.

#### 1.2 Write a controller

Every controller exports an `async function (req, services)`:

```js
// controllers/live.js — read live telemetry
module.exports = async function live (req, services) {
  const deviceId = req.query.deviceId
  const telemetry = await services.mdkClient.pullTelemetry(deviceId, 'metrics')
  return { deviceId, ...telemetry }
}
```

```js
// controllers/command.js — dispatch a command
module.exports = async function command (req, services) {
  const deviceId = req.params.deviceId
  const { mode } = req.body

  const result = await services.mdkClient.sendCommand(deviceId, 'setPowerMode', { mode })

  return {
    deviceId,
    commandId: result.commandId,
    status: result.status
  }
}
```

</Step>

</Steps>

### The `req` object

| Field | Type | Contains |
| --- | --- | --- |
| `req.params` | `object` | Path parameters (e.g. `{ deviceId: 'wm-001' }`) |
| `req.query` | `object` | Query string parameters |
| `req.body` | `object` | Parsed JSON request body |
| `req.headers` | `object` | HTTP headers |
| `req._info` | `object` | Internal request metadata (rarely needed) |

### The `services` object

| Field | Type | Use for |
| --- | --- | --- |
| `services.mdkClient` | `MdkClient` | Live reads and command dispatch — `sendCommand`, `pullTelemetry`, `getCapabilities`, `listWorkers` |
| `services.dataProxy` | `DataProxy` | Historical and aggregated data from Worker tail-logs — `requestData`, `requestDataMap` |
| `services.conf` | `object` | Gateway runtime config |

> [!IMPORTANT]
> Always guard `services.mdkClient` — it is `null` when the Gateway starts without a live Kernel connection:
> ```js
> if (!services.mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')
> ```

### Read hardware data

For live device data use `mdkClient`:

```js
// Pull a live metrics snapshot
const tel = await services.mdkClient.pullTelemetry(deviceId, 'metrics')

// Pull the declared capabilities (from the Worker's mdk-contract.json)
const { capabilities } = await services.mdkClient.getCapabilities(deviceId)

// List all registered Workers
const { workers } = await services.mdkClient.listWorkers()
```

For historical or aggregated series from a Worker's persisted tail-log use `dataProxy`:

```js
const results = await services.dataProxy.requestData('tailLogRangeAggr', {
  type: 'miner',
  startDate: start,
  endDate: end,
  fields: { hashrate_sum: 1 }
})
```

The [default telemetry controllers][telemetry-controllers] show worked examples of both patterns.

### Send a command

`sendCommand` dispatches via the Kernel to the Worker that owns the device. The command must be declared in 
the Worker's `mdk-contract.json`. It returns:

| Field | Type | Description |
| --- | --- | --- |
| `commandId` | `string` | Correlation ID generated by Kernel. Echo this to the HTTP caller so they can track the operation. |
| `status` | `string` | `'SUCCESS'` or `'FAILED'` |
| `result` | `object` | Command-specific response payload (present when status is `'SUCCESS'`) |
| `error` | `string` | Error message (present when status is `'FAILED'`) |

```js
const result = await services.mdkClient.sendCommand(deviceId, 'reboot', {})
if (result.status === 'FAILED') throw new Error(result.error)
return { commandId: result.commandId, status: result.status }
```

### Caching

Add a `"cache"` array of dot-path strings to a route to enable request-level caching. The cache key is composed 
from the route ID and the resolved values of each path:

```json
{
  "id": "telemetry.hashrate",
  "cache": ["query.start", "query.end", "query.groupBy"],
  ...
}
```

Pass `?overwriteCache=true` to bypass and refresh.

### Auth and permissions

The Gateway applies no authentication of its own. Every route a plugin declares is served to any caller, so a route that needs protecting carries
that logic in its own controller. Identity is yours to supply: the manifest `"auth"` and `"permissions"` fields have no reader and change nothing.

Validate the token with your own identity layer and check it in the handler:

```js
const { validateToken } = require('../lib/my-identity-layer')

module.exports = async function protectedRoute (req, services) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new Error('ERR_UNAUTHORIZED')

  const { permissions } = validateToken(token)
  if (!permissions.includes('miner:w')) throw new Error('ERR_FORBIDDEN')

  // Your route logic
}
```

> [!IMPORTANT]
> A controller cannot choose its status code. It receives `(req, services)` and never the Fastify reply, so a returned value goes out as `200` and a
> thrown `ERR_`-prefixed error becomes `400 Bad Request` carrying that message. `ERR_UNAUTHORIZED` reaches the client as `400`, not `401`. A route that
> needs true status control belongs in [raw Fastify routes][gateway-additional-routes] instead.

### Manifest validation errors

The plugin loader validates every manifest and handler at startup and throws if anything is wrong:

| Error | Cause |
| --- | --- |
| `ERR_PLUGIN_MANIFEST_MISSING` | No `mdk-plugin.json` found in the plugin directory |
| `ERR_PLUGIN_MANIFEST_INVALID` | JSON parse error, or missing required field (`name`, `version`, or `routes`) |
| `ERR_PLUGIN_ROUTE_DUPLICATE_ID` | Two routes in the same manifest share the same `id` |
| `ERR_PLUGIN_HANDLER_NOT_FOUND` | The `handler` file path does not exist or failed to load |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION` | The handler file exports something other than a function |

## Next steps

- Try the [live site backend example][all-workers-guide] for a complete worked plugin with three routes: a live site overview,
  a historical series, and a command endpoint running under PM2 or Docker
- Build the [minimal dashboard tutorial][minimal-dashboard] — end-to-end worked example of the single-plugin + controller pattern
- Understand [how Workers declare their data][build-a-worker] via `mdk-contract.json` — what `mdkClient` reads and `sendCommand` dispatches
- See the full [manifest and services reference][plugins-readme]
- Review the [Gateway API and config][gateway-readme]

## Links

[telemetry-controllers]: ../../../backend/core/plugins/telemetry/controllers
<!-- docs@tether.io: telemetry-controllers → https://github.com/tetherto/mdk/tree/main/backend/core/plugins/telemetry/controllers -->

[auth-plugin-readme]: ../../../backend/core/plugins/README.md#the-bundled-auth-plugin
<!-- docs@tether.io: auth-plugin-readme → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md#the-bundled-auth-plugin -->

[gateway-additional-routes]: ../../../backend/core/gateway/README.md#raw-fastify-routes
<!-- docs@tether.io: gateway-additional-routes → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#raw-fastify-routes -->

[all-workers-guide]: ../deployment/run-all-workers-site.md
<!-- docs@tether.io: all-workers-guide → guides/deployment/run-all-workers-site -->

[full-site-plugin]: ../../../examples/full-site/plugins/site
<!-- docs@tether.io: full-site-plugin → https://github.com/tetherto/mdk/tree/main/examples/full-site/plugins/site -->

[e2e-manifest]: ../../../examples/backend/mdk-plugin-e2e/gateway-plugin/mdk-plugin.json
<!-- docs@tether.io: e2e-manifest → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-plugin-e2e/gateway-plugin/mdk-plugin.json -->

[serve-an-endpoint]: ../../tutorials/serve-an-endpoint.md
<!-- docs@tether.io: no parity link -->
<!-- mdk-monorepo: routed page parked on the docs site; restore the slug rewrite when it is unparked -->

[full-site-manifest]: ../../../examples/full-site/plugins/site/mdk-plugin.json
<!-- docs@tether.io: full-site-manifest → https://github.com/tetherto/mdk/blob/main/examples/full-site/plugins/site/mdk-plugin.json -->

[telemetry-manifest]: ../../../backend/core/plugins/telemetry/mdk-plugin.json
<!-- docs@tether.io: telemetry-manifest → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/telemetry/mdk-plugin.json -->

[plugins-readme]: ../../../backend/core/plugins/README.md
<!-- docs@tether.io: plugins-readme → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md -->

[plugins-manifest]: ../../../backend/core/plugins/README.md#manifest-format
<!-- docs@tether.io: plugins-manifest → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md#manifest-format -->

[mdk-client-readme]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[minimal-dashboard]: ../../tutorials/build-a-dashboard.md
<!-- docs@tether.io: minimal-dashboard → tutorials/build-a-dashboard -->
[build-a-worker]: ../workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[mcp-server]: ../../../examples/full-site/docs/mcp-server.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/examples/full-site/docs/mcp-server.md -->
