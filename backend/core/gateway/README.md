# Gateway

## Overview

The Gateway is where your business logic is defined and you can extend the logic with [plugins](#extend-the-gateway). It's your Node.js server 
that connects to the Kernel over HRPC, sends typed queries and receives aggregated responses. You decide what happens to your telemetry data.

[Gateway](../../../docs/concepts/stack/gateway.md), `@tetherto/mdk-gateway`, wraps [`@tetherto/mdk-client`](../client/README.md)
and delivers an HTTP interface for consumers that need those capabilities. It handles plugin-declared routing and fleet aggregation
on top of the [Kernel](../kernel/README.md). Agents can reach MDK over MCP through the standalone [`@tetherto/mdk-mcp`](../mcp/README.md) package.

Authentication is not among its responsibilities, as the [security model](#security-model) sets out.
For use cases that do not need the Gateway's HTTP surface or plugin system, see
[Connect without the Gateway](../../../docs/concepts/stack/gateway.md#connect-without-the-gateway).

> [!TIP] 
> New to the Gateway? Read the [Gateway concept page](../../../docs/concepts/stack/gateway.md). 
> Ready to run it? Follow the [run guide](../../../docs/guides/gateway/run.md).

> [!NOTE]
> `startGateway()`, used throughout this page, is exported by [`@tetherto/mdk`](../mdk/README.md), not by this
> `@tetherto/mdk-gateway` package — it's the bootstrap function that boots this Gateway worker. The Gateway connects
> to Kernel via [`@tetherto/mdk-client`](../client/README.md). While `startGateway()` currently accepts one Kernel
> endpoint: `kernel`, `kernelKey`, or a key file, multi-site aggregation (a single Gateway fronting several per-site
> Kernel kernels via `mdk-client`) is on the roadmap.

## HTTP API overview

The Gateway declares no application routes of its own. Every REST route it serves comes from one of three places, all wired in
[`http.node.wrk.js`](workers/http.node.wrk.js):

| Source | How it arrives |
|--------|----------------|
| Plugins | `telemetry`, `site-hashrate`, and `site-monitor` are registered at startup; your own follow via `extraPluginDirs` |
| [`additionalRoutes`](#raw-fastify-routes) | Raw Fastify route objects you pass to `startGateway()` |
| `GET /echo` | A debug route contributed by the httpd facility's `addDefaultRoutes` |

Which paths that adds up to is a property of the manifests, not of the Gateway. The
[plugin route reference](../plugins/README.md#default-plugins) lists every route the registered plugins serve, generated from their
`mdk-plugin.json` files so it cannot drift.

## Live data

The Gateway has no push channel — clients poll its HTTP routes for updates. The
[React adapter](../../../ui/packages/react-adapter/README.md) does this on fixed cadences for its hooks (for example, `useThingDetail`
polls every 20 seconds, `useExplorerList` every 60).

## Configuration

Config files are written to `opts.root/config/facs/` by `startGateway()`. Example files ship in `backend/core/gateway/config/facs/*.example`.
Edit the generated files to persist your changes across restarts.

| File | Controls |
|------|---------|
| `httpd.config.json` | Fastify HTTP server options |
| `store.config.json` | SQLite and Hyperbee storage paths |
| `net.config.json` | IP assignment (DHCP facility) |
| `logging.config.json` | Log level, format |

> [!NOTE]
> No config file here controls [authentication](../../../docs/guides/gateway/plugins.md#auth-and-permissions), because the Gateway performs none. 
> Callers must be validated by your own identity layer, invoked from the controllers that need it.

## Kernel connection

The Gateway dials Kernel over HRPC (`@hyperswarm/rpc`) using the Kernel's listener public key. `startGateway()` resolves that key
**before any boot side effects**, in this order:

1. `kernelKey` — hex string or Buffer. Pass `kernelKey: false` to run without a Kernel connection (useful when testing without a live Kernel; 
`services.mdkClient` stays `null`).
2. `kernel` — an in-process `KernelManager` handle; the key comes from `kernel.getPublicKey()`.
3. Key file — `keyFile` (default: `DEFAULT_KEY_FILE`, i.e. `os.tmpdir()/mdk/.kernel-key`), which `getKernel()` publishes on start.
4. If none resolves, `startGateway()` throws `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

**Zero-config (same host, default)**: Start the Kernel with `getKernel()`, then `startGateway()` with no endpoint options: the
Gateway picks the key up from the key file automatically.

**Cross-host**: Obtain the Kernel listener key with `kernel.getPublicKey().toString('hex')` on the host running Kernel, then pass
it on the Gateway host:

```js
await startGateway({ kernelKey: '<kernel-listener-pubkey-hex>' })
```

For testnets, pass `bootstrap` to thread custom DHT bootstrap nodes to the Gateway's Client.

Note the resolution happens in `startGateway()`, not in the worker: the Gateway worker (`http.node.wrk.js`) consumes `ctx.kernelKey`
(plus optional `ctx.kernelBootstrap`) and deliberately does not read the key file itself — raw `worker.js` boots must pass
`ctx.kernelKey` explicitly. If the HRPC connect fails, the worker degrades gracefully (`mdkClient = null`) instead of crashing the
HTTP server.

Pre v1.0, Kernel's `auth.whitelist` defaults to empty (any HRPC caller is admitted). When an allowlist is configured, the Gateway's DHT
public key must be added before the connection is accepted — see [Kernel transport](../kernel/README.md#transports).

## Security model

- **No built-in user authentication**: the Gateway serves the routes its plugins declare to any caller. Validating callers is work each controller
  does for itself, using an identity layer you supply
  ([auth and permissions](../../../docs/guides/gateway/plugins.md#auth-and-permissions))
- **Kernel connection security**: the HRPC connection is an encrypted Noise channel. Kernel maintains an HRPC firewall; when
  `auth.whitelist` is configured, the Gateway's DHT public key must be in Kernel's `auth.whitelist` (pre v1.0 the default is an
  empty allowlist, so any caller is admitted).
  See [Kernel Transport](../kernel/README.md#transports) and the [`auth-whitelist` example](../../../examples/backend/kernel/auth-whitelist.js)
  for the key exchange pattern
- Once connected, Kernel trusts all messages from the Gateway implicitly, apart from the device-family write permissions it requires in the
  `authPerms` array accompanying each write action
- Human and AI callers reach the same routes on the same terms, since the Gateway distinguishes neither

## Extend the Gateway

### Plugin system (recommended)

Pass plugin directories via `extraPluginDirs` to load additional routes at startup alongside the default plugins:

```js
await startGateway({
  kernel,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/my-metrics')
  ]
})
```

Plugins receive `(req, services)` in every controller, where `services.mdkClient` and `services.dataProxy` give access to Kernel
and historical data without any protocol knowledge. The default plugins (`telemetry`, `site-hashrate`, `site-monitor`) are loaded the same way.

The [plugin authoring guide](../../../docs/guides/gateway/plugins.md) and the [plugin reference](../plugins/README.md) cover the full 
manifest schema, controller contract, services bag, and loader errors.

### Raw Fastify routes

For one-off handlers that do not need the plugin manifest format, pass `additionalRoutes` directly:

```js
await startGateway({
  kernel,
  additionalRoutes: [
    {
      method: 'GET',
      url: '/custom/endpoint',
      handler: async (req, reply) => { return { ok: true } }
    }
  ]
})
```

These are registered as plain Fastify routes: no `services` injection and no manifest validation. Unlike a plugin controller, the handler
receives the Fastify `reply`, so this is the way to control status codes.

## Directory layout

```
gateway/
├── workers/
│   ├── http.node.wrk.js          # WrkServerHttp — Fastify worker, mounts plugins and routes
│   └── lib/
│       ├── plugin-loader.js      # Loads mdk-plugin.json manifests, validates structure
│       ├── plugin-adapter.js     # Converts plugin routes to Fastify handlers, applies caching
│       ├── data.proxy.js         # Historical data aggregation via worker tail-logs
│       ├── constants.js
│       ├── utils.js
│       └── server/lib/           # cachedRoute.js and send200.js, used by the adapter
├── config/
│   └── facs/                     # Example config files (*.json.example)
├── db/                           # SQLite database files
└── tests/
    ├── unit/lib/                 # One suite per lib module
    └── integration/
        └── api.test.js           # HTTP route tests
```

## Next steps

- Understand the [Gateway as a development surface](../../../docs/concepts/stack/gateway.md)
- [Run the Gateway](../../../docs/guides/gateway/run.md)
- [Add routes with the plugin system](../../../docs/guides/gateway/plugins.md)
- Browse the [default plugin route reference](../plugins/README.md)
- See a complete [worked example](../../../examples/full-site/README.md)
- Browse the [`startGateway()` options](../mdk/README.md)
