# @tetherto/mdk-mcp

## Overview

MCP (Model Context Protocol) server for MDK. Exposes MDK data and actions to AI agents as declarative tools over a
`StreamableHTTPServerTransport`. It's a standalone server — a separate process from the [Gateway](../gateway/README.md),
not a Gateway plugin — that talks to Kernel the same way the Gateway does, over
[`@tetherto/mdk-client`](../client/README.md).

## `createMcpServer(root, port, client, pluginDirs)`

```js
const { createMcpServer } = require('@tetherto/mdk-mcp')
const { createMdkClient } = require('@tetherto/mdk-client')

const client = createMdkClient({ hrpc: { key: kernelKey } })
await client.connect({ warmup: true })

await createMcpServer(root, port, client, pluginDirs)
```

| Param | Type | Description |
|---|---|---|
| `root` | `string` | Working directory for this server instance. Throws `ERR_INVALID_MCP_ROOT` if falsy. |
| `port` | `number` | Port to listen on (`127.0.0.1` only). Throws `ERR_INVALID_MCP_PORT` if falsy. |
| `client` | `MdkClient` | A connected [`@tetherto/mdk-client`](../client/README.md) instance; handed to every tool as `services.mdkClient`. |
| `pluginDirs` | `string[]` | Directories to load tools from (see below). Empty/omitted starts a server with no tools. |

The server answers `POST /mcp` only — everything else gets a `404`. It builds a fresh `McpServer` per request (stateless
transport, no session id). `SIGINT`/`SIGTERM` are handled for you: they close `client` first, then stop the HTTP server.

## Plugin format

A plugin is a directory with an `mcp-plugin.json` manifest and one or more handler files — the same discovery pattern as a
Gateway plugin, but with `tools` instead of `routes`.

```json
{
  "name": "@your-scope/your-plugin",
  "version": "1.0.0",
  "tools": [
    { "id": "get_status", "handler": "./tools/get-status.js", "description": "Reports fleet status" }
  ]
}
```

Each handler file exports a `handler` function and an optional `schema` (a Zod shape — validated by the MCP SDK before your
handler runs):

```js
const { z } = require('zod')

module.exports = {
  schema: { deviceId: z.string() },
  handler: async ({ deviceId }, services) => {
    const telemetry = await services.mdkClient.pullTelemetry(deviceId, 'metrics')
    return { content: [{ type: 'text', text: JSON.stringify(telemetry) }] }
  }
}
```

`loadPlugin()` validates the manifest and every handler at load time, throwing `ERR_PLUGIN_MANIFEST_MISSING`,
`ERR_PLUGIN_MANIFEST_INVALID`, `ERR_PLUGIN_HANDLER_NOT_FOUND`, `ERR_PLUGIN_HANDLER_NOT_FUNCTION`, or
`ERR_PLUGIN_TOOL_DUPLICATE_ID` on the first problem.

## Real usage

`examples/mvp-site/deploy/run-process.js` runs this as its own PM2-supervised process (`--role mcp`): it connects a
[`@tetherto/mdk-client`](../client/README.md) to Kernel over HRPC using the same `.kernel-key` discovery the Gateway uses,
then calls `createMcpServer(root, port, client, MCP_PLUGIN_DIRS)`.

## Testing

`npm test` runs `standard` lint, unit tests (`tests/unit/`), and integration tests (`tests/integration/`) — the latter cover
schema enforcement, multi-plugin-dir merging, thrown-handler-error propagation, and the shutdown handlers.
