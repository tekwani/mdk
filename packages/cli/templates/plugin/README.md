# __PLUGIN_NAME__

An MDK **Gateway Plugin** — HTTP endpoints served by the Gateway that aggregate
data from your workers' devices over the MDK protocol. A plugin is a manifest
([`mdk-plugin.json`](./mdk-plugin.json)) plus one controller module per route; the Gateway loads the
directory and mounts each route. There is no root export.

## Layout

```
mdk-plugin.json      # route manifest: id, handler, http.method + http.path
lib/client.js        # ambient MDK client from @tetherto/mdk-gateway/plugin
controllers/*.js     # one module per route: async (req) => result
```

Each controller receives `req` (`{ params, query, body, headers }`). Talk to
the Kernel through the plugin-owned client in `lib/client.js`, which is built
from the ambient import override:

```js
const { config } = require('@tetherto/mdk-gateway/plugin')
const { createMdkClient } = require('@tetherto/mdk-client')
module.exports = createMdkClient(config)
```

The Gateway loader freezes a per-plugin context onto
`@tetherto/mdk-gateway/plugin` (same pattern as `backend/plugins/agent`), so
`config` already includes `kernelKey` / `kernelBootstrap` plus this plugin's
`spec.gateway.plugins[].config` block. Controllers do **not** take `mdkClient`
from a `services` parameter.

The return value is sent as JSON (HTTP 200). Throw `Error('ERR_...')` to return a 400.

## Run it

This plugin is registered in your stack's `mdk.yaml` by **package name** and
resolved from `node_modules` (the `plugins/*` workspace links it):

```yaml
spec:
  gateway:
    plugins:
      - package: __PLUGIN_NAME__
        config: {}
```

Then boot the Gateway:

```bash
mdk run gateway     # just the gateway
# or `mdk run` to boot the whole stack together
```

Call it: `GET http://localhost:<gatewayPort>/api/__PLUGIN_NAME__/summary`.
