# Gateway

## Overview

The Gateway is a router for [apps](#extend-the-gateway): each app is a plugin that defines its own routes and business logic, runs
in its own [`@tetherto/mdk-app-runtime`](../app-runtime/README.md) process, and opens its own connection to Kernel. The Gateway reads
each app's route table (`mdk-plugin.json`) and forwards every request to the app's runtime over HRPC; it executes no app code.

The Gateway, `@tetherto/mdk-gateway`, delivers an HTTP interface on top of the
[Kernel](../kernel/README.md): each app builds its own [`@tetherto/mdk-client`](../client/README.md) from its context to reach
the Kernel, which routes a query to whichever [Worker](../../workers/README.md) owns the target device.

The Gateway gates routes a manifest marks `"auth": true` through an `authVerifier` you supply, and identifying the caller stays
your identity layer's job, as the [security model](#security-model) sets out.

> [!NOTE]
> The Gateway's responsibilities stop at forwarding the request to the right controller and returning whatever that controller produces;
> it never combines results from more than one controller itself. The route (the URL your app calls) is handled entirely by the plugin
> that declared it. That plugin's "controller" must build the whole answer
> and hand it back as the HTTP response. If a route needs to combine telemetry from many
> devices, such as total hashrate across every miner on site, that happens inside that one controller, which must
> query every relevant Worker and aggregate the results.

## HTTP API overview

The Gateway declares no application routes of its own. Every REST route it serves comes from one of three places, all wired in
[`http.node.wrk.js`](workers/http.node.wrk.js):

| Source | How it arrives |
|--------|----------------|
| Apps | Every app the stack declares in `spec.apps[]`, or that you pass as `apps` — and nothing else. Mounted under `/apps/<name>` unless the app sets `mount` |
| [`additionalRoutes`](#raw-fastify-routes) | Raw Fastify route objects you pass to `startGateway()` |
| Static files | `GET /*` from `staticRootPath`, only when `common.json` sets it |

Which paths that adds up to is a property of the manifests, not of the Gateway. The
plugin route reference lists every route the plugins MDK ships serve, generated from their
`mdk-plugin.json` files so it cannot drift.

> [!IMPORTANT]
> A Gateway loads **only** what it is told to load. A stack serves just the apps it declares, and any other path gets `404`.

### Request forwarding

Each route is a Fastify route, so its `schema` is enforced at the Gateway. The Gateway reads the runtime's key from the app's `keyFile`
on every request and forwards `{ params, query, body, headers }` by route `id`. A unary result comes back as JSON, so a controller
returns plain data (a `Buffer` would arrive as its JSON form); a `stream: true` route pipes the runtime's status,
headers and body to the response. The `authorization`, `proxy-authorization` and `cookie` headers are not forwarded: the caller's
identity reaches the app as `req._info`, and app code never sees credentials it could replay. A missing or invalid key file answers
`503` `ERR_APP_RUNTIME_UNAVAILABLE: <name>` (a runtime removes its key file when it stops), an unreachable runtime `502`. A unary
call, and the wait for a stream's response head, is bounded by `spec.gateway.config.appTimeoutMs` in `mdk.yaml` (default `60000`);
past it the Gateway answers `504` `ERR_APP_RUNTIME_TIMEOUT`. A client that disconnects first aborts its call: while the runtime connection is
still opening the request is never sent, and a stream's channel is closed so the controller's response emits `close`. A `cache`
route is cached under the app name, route id and the named request fields (plus a hash of the caller's identity on an `auth: true`
route), and is not aborted, since waiting requests share it.

## Live data

The Gateway has no push channel — clients poll its HTTP routes for updates.

> A UI reads a route with `useQuery` and a `refetchInterval` — the [mvp-site](../../../examples/mvp-site/README.md) dashboard
> polls its `site` plugin's routes this way. Pick the interval per route: fast for live readings, slow for inventory.

## Configuration

Config files are written to `opts.root/config/facs/` by `startGateway()`. Example files ship in `backend/core/gateway/config/facs/*.example`.
Edit the generated files to persist your changes across restarts.

| File | Controls |
|------|---------|
| `httpd.config.json` | Fastify HTTP server options |
| `store.config.json` | Hyperbee store path; the store holds identity seeds only |
| `net.config.json` | IP assignment (DHCP facility) |
| `logging.config.json` | Log level, format |

HTTP hardening is read from `startGateway()` options first, then from `common.json`, then from the defaults below. A
custom `authVerifier` is a function, so only `startGateway()` (or a programmatic worker `ctx`) can pass one; the name of a
built-in verifier (`"loopback"`) can also come from `common.json`.

| Option | Default | Effect |
|--------|---------|--------|
| `authVerifier` | none | `async (request, route) => identity \| false`, or `"loopback"`. Runs for every `auth: true` route; see [security model](#security-model) |
| `allowedHosts` | `[]` | Extra `Host` values served, as `name` (any port) or `name:port`. `localhost`, `127.0.0.1` and `[::1]` on the bound port, plus a specific bind address, are always allowed. `["*"]` turns the check off |
| `trustProxy` | `false` | Fastify `trustProxy`. Set it only behind a proxy you control, or client IPs and `X-Forwarded-Host` can be spoofed |
| `bodyLimit` | `1048576` | Largest request body in bytes; a larger one gets `413` |
| `rateLimit` | `{ max: 300, timeWindow: "1 minute" }` | [`@fastify/rate-limit`](https://github.com/fastify/fastify-rate-limit) options, keyed by client IP; `false` disables |
| `helmet` | Helmet defaults without `upgrade-insecure-requests` | [`@fastify/helmet`](https://github.com/fastify/fastify-helmet) options; `false` disables |
| `staticRootPath` | unset | Directory served at `GET /*` (with `index.html` for unknown paths). Static serving is off unless you set it |

```js
await startGateway({
  kernel,
  authVerifier: async (request, route) => {
    const token = request.headers.authorization?.replace('Bearer ', '')
    return token ? await myIdentityLayer.verify(token) : false // e.g. { user: { userId }, perms: ['miner:w'] }
  },
  allowedHosts: ['mdk.example.com', '10.0.0.4:3000']
})
```

## Kernel connection

> [!NOTE]
> `startGateway()`, used throughout this section, is exported by [`@tetherto/mdk-core`](../mdk/README.md), not by this
> `@tetherto/mdk-gateway` package.

The Gateway opens no Kernel connection: each app runtime dials Kernel over HRPC (`@hyperswarm/rpc`) with its own keypair, using the
Kernel's listener public key. `startGateway()` still resolves that key
**before any boot side effects**, in this order:

1. `kernelKey`: hex string or Buffer. Pass `kernelKey: false` to run without a Kernel key (useful when testing without a live Kernel).
2. `kernel`: an in-process `KernelManager` handle; the key comes from `kernel.getPublicKey()`.
3. Key file: `keyFile` (default: `DEFAULT_KEY_FILE`, i.e. `~/.mdk/.kernel-key`), which `getKernel()` publishes on start.
4. If none resolves, `startGateway()` throws `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

**Zero-config (same host, default)**: Start the Kernel with `getKernel()`, then `startGateway()` with no endpoint options: the
Gateway picks the key up from the key file automatically.

**Cross-host**: Obtain the Kernel listener key with `kernel.getPublicKey().toString('hex')` on the host running Kernel, then pass
it on the Gateway host:

```js
await startGateway({ kernelKey: '<kernel-listener-pubkey-hex>' })
```

For testnets, pass `bootstrap` to set the DHT bootstrap nodes of the Gateway's client to app runtimes (`ctx.kernelBootstrap`).

Kernel's allowlist (`auth.whitelist`) is fail-closed: empty admits nobody, so [each app runtime's Kernel public key must be admitted
before the connection is accepted](../kernel/README.md#caller-admission-and-roles). A runtime writes that key to its `kernelKeyFile`;
`mdk run` points it into the trusted-keys dir, where the Kernel admits it. It is derived from a seed persisted in the runtime's store,
so it survives restarts. `startGateway({ kernel })` from `@tetherto/mdk-core` also admits the Gateway's own DHT key (`status.rpcClientKey`)
on an in-process Kernel and publishes it to the trusted-keys dir for same-machine Kernels and Workers.

## Security model

- **Routes marked `"auth": true` fail closed**: before body parsing, validation, the cache or the forward to the app runtime, the Gateway
  calls the configured `authVerifier(request, route)`. `route` is `{ id, method, path, app, permissions }` from the manifest. A falsy return,
  or no verifier at all, answers `401 ERR_AUTH_UNAUTHORIZED`; a verifier may throw its own `4xx` `ERR_*` error (for example
  `403 ERR_AUTH_PERM_DENIED`), and any other throw is a `401`. A truthy return is the caller's identity: it is forwarded to the runtime and
  reaches the controller as `req._info`. The Gateway ships no identity layer, so checking permissions against the identity stays with the
  verifier or the controller ([auth and permissions](../../../docs/guides/gateway/apps.md#auth-and-permissions))
- **Built-in `"loopback"` verifier** for single-machine stacks (`mdk run`, the examples): a caller whose TCP peer is
  `127.0.0.0/8` or `::1` gets `{ user: { userId: 'local' } }`; anyone else gets `401`. It reads the socket, never
  `X-Forwarded-For`, so do not use it behind a reverse proxy on the same host, where every proxied request is loopback.
  A browser request also needs a loopback `Origin` (`localhost`, `127.0.0.1`, `[::1]` on any port) or, while the Host
  allowlist is on, the Gateway's own origin, and must not carry `Sec-Fetch-Site: cross-site`, so a page on another site open
  in the operator's browser cannot drive `auth: true` routes with a blind cross-site `POST`. With `allowedHosts: ["*"]` the
  `Host` header is unchecked, so a same-origin `Origin` proves nothing (a DNS-rebound page is "same origin" with itself) and
  only loopback Origins, or none, are accepted
- **Routes without `"auth": true` are open**: any caller that passes the Host check reaches them, with `req._info` set to `{}`
- **Host allowlist**: a request whose `Host` header is not in `allowedHosts` (loopback on the bound port by default) gets
  `403 ERR_GATEWAY_HOST_NOT_ALLOWED`, which blocks DNS-rebinding pages from reading a gateway on `localhost`. Add the names
  your clients use when you bind to a LAN address or put the Gateway behind a proxy
- **Limits and headers**: rate limiting (`429 ERR_RATE_LIMITED`, counted before the auth check so failed attempts are throttled), a
  configurable `bodyLimit`, and Helmet security headers are on by default. `trustProxy` is off. There is no `GET /echo` route
- **Input validation**: path, query and header `parameters` and the `application/json` `requestBody` schema are validated before the request
  is forwarded
- **Per-caller cache on `auth: true` routes**: a `cache` route behind auth adds a SHA-256 of the verified identity (`req._info`) to
  its cache key, so two callers never share a cached response or an in-flight call. Open routes keep one shared entry per key
- **Cache refresh**: `?overwriteCache=true` bypasses a cached response only for a caller the `authVerifier` returned with `cache:overwrite`
  in its `perms` array
- **App code runs outside the Gateway**: the Gateway reads only each app's route table; the controllers run in the app's own runtime
  process, and a manifest `handler` must resolve inside its plugin directory
- **App runtime security**: a runtime admits only the public keys in its `allowedKeys`/`allowedKeyFiles`. The Gateway presents one
  key to every runtime, written to `gatewayKeyFile` (and `status.appClientKey`) and derived from a seed at
  `<root>/identity/seedRuntimeClient` (`0600`), so it survives restarts. The key file is replaced atomically with mode `0644`
  in a directory created `0700`, since runtimes refuse an allowed-key file that is group/other-writable or owned by another user
- **Static files**: static serving goes through `@fastify/static`, which `@tetherto/svc-facs-httpd@2.0.1` pins to `^9`. That range carries
  GHSA-8pvw-jcv7-9cmj and GHSA-83w8-p2f5-377r. Add the override in [Known dependency advisory](#known-dependency-advisory) to your
  app, or leave `staticRootPath` unset in production and serve the UI from a separate web server or proxy
- **Kernel connection security**: the HRPC connection is an encrypted Noise channel. Kernel's HRPC firewall is fail-closed: each app
  runtime's Kernel public key (its `kernelKeyFile`, stable across restarts) must be admitted (`auth.whitelist`, `kernel.allowKey()`, or
  the trusted-keys dir). Workers that app clients call directly must allow the same key (`allowedKeys`).
  See [Kernel Transport](../kernel/README.md#transports) and the `auth-whitelist` example
  for the key exchange pattern
- Once connected, Kernel trusts all messages from an app runtime implicitly, apart from the device-family write permissions it requires in the
  `authPerms` array accompanying each write action
- Human and AI callers reach the same routes on the same terms, since the Gateway distinguishes neither

## Known dependency advisory

A fresh install of `@tetherto/mdk-gateway` (and of `@tetherto/mdk-core` and `@tetherto/mdk-mcp`, which depend on it) resolves
`@fastify/static@9.x` through `@tetherto/svc-facs-httpd@2.0.1`. `npm audit` then reports one high advisory
(GHSA-8pvw-jcv7-9cmj, GHSA-83w8-p2f5-377r) on `@fastify/static`, and moderate ones on the packages that pull it in. The
vulnerable code runs only when `staticRootPath` is set; static serving is off by default.

The fix needs a `svc-facs-httpd` release on `@fastify/static ^10.1.2`. Until then, add an override to your app's **root**
`package.json`. npm applies `overrides` only from the project being installed, so this package cannot set it for you:

```json
{
  "overrides": {
    "@fastify/static": "^10.1.2"
  }
}
```

Then reinstall and confirm:

```bash
npm install
npm ls @fastify/static     # @fastify/static@10.x under @tetherto/svc-facs-httpd
npm audit --omit=dev       # no @fastify/static advisory
```

`svc-facs-httpd` uses `@fastify/static` only through `register(...)` with `root`, `prefix` and `constraints`, plus `reply.sendFile`
for the 404 page, and these work unchanged on 10.x. Remove the override once a `svc-facs-httpd` release requires `^10`.

## Extend the Gateway

### Apps (recommended)

Pass each app's directory and the file its runtime writes its key to via `apps` to mount its routes at startup:

```js
await startGateway({
  kernel,
  gatewayKeyFile: './run/gateway.key',
  apps: [
    { name: 'my-metrics', appDir: path.join(__dirname, 'apps/my-metrics'), keyFile: './run/my-metrics.key' }
  ]
})
```

Run each app with [`createAppRuntime()`](../app-runtime/README.md) and `allowedKeyFiles: ['./run/gateway.key']`. Controllers receive
`(req)`, and each builds its own `@tetherto/mdk-client` from the context config it reads via `require('@tetherto/mdk-gateway/plugin')`.
The plugins MDK ships run the same way, only when a stack declares them; nothing auto-registers.

The [Gateway apps guide](../../../docs/guides/gateway/apps.md) and the [supported apps reference](../../../docs/reference/supported-apps.md) cover the full
manifest schema, controller contract, and app context, and [what the loader throws](#errors) is documented here.

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

These are registered as plain Fastify routes: no app runtime and no manifest validation. Unlike an app controller, the handler
receives the Fastify `reply`, so this is the way to control status codes.

## Errors

[`loadPlugin()`](../app-runtime/lib/plugin-loader.js) validates every manifest at startup (the Gateway reads route tables only; an app
runtime also loads the handlers) and throws on the first problem. The `apps` option errors are in the
[`startGateway()` reference](../mdk/README.md):

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_PLUGIN_MANIFEST_MISSING` | No `mdk-plugin.json` in the plugin directory | Add the manifest, or fix the app's `appDir` |
| `ERR_PLUGIN_MANIFEST_INVALID` | The manifest fails to parse as JSON, parses to a non-object value (e.g. a bare string or number), or is missing `name`, `version`, `routes`, or a route is missing `id`/`handler`/a valid `method`/`path`, has a `path` that does not start with `/`, or has a non-boolean `auth`. A JSON array manifest passes the object check and fails on the missing `name` field instead — same code, different message. | Fix the field the error message names |
| `ERR_PLUGIN_ROUTE_DUPLICATE_ID` | Two routes in the same manifest share an `id` | Rename one of the duplicate route ids |
| `ERR_PLUGIN_ROUTE_DUPLICATE_PATH` | Two routes in the same manifest share a method and path (`/x/{id}` and `/x/:id` are the same path) | Remove or move one of them |
| `ERR_PLUGIN_HANDLER_NOT_FOUND` | A route's `handler` file path doesn't exist | Fix the `handler` path for that route |
| `ERR_PLUGIN_HANDLER_LOAD_FAILED` | The `handler` file exists but cannot load: a dependency is not installed, or it throws when required. The message carries the cause | Install the app's dependencies, or fix the error the message names |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION` | A route's resolved handler module (or named export) isn't a function | Export a function from the file |
| `ERR_PLUGIN_HANDLER_OUTSIDE_PLUGIN` | A route's `handler` is absolute or resolves outside the plugin directory | Move the handler into the plugin and use a relative path |

Booting the Gateway also throws `ERR_GATEWAY_AUTH_VERIFIER_INVALID`, `ERR_GATEWAY_ALLOWED_HOSTS_INVALID` or `ERR_GATEWAY_BODY_LIMIT_INVALID`
when the matching [option](#configuration) has the wrong type.

## Directory layout

```text
gateway/
├── workers/
│   ├── http.node.wrk.js          # WrkServerHttp — Fastify worker, mounts app routes
│   └── lib/
│       ├── plugin-loader.js      # Re-exports @tetherto/mdk-app-runtime's manifest loader
│       ├── plugin-adapter.js     # Converts app routes to Fastify handlers that forward to the runtime, applies caching
│       ├── plugin-gateway.js     # Builds a plugin's context ({ config }), for the MCP server
│       ├── security.js           # authVerifier hook, Host allowlist, hardening defaults
│       ├── constants.js
│       ├── utils.js
│       └── server/lib/           # cachedRoute.js and send200.js, used by the adapter
├── config/
│   └── facs/                     # Example config files (*.json.example)
├── db/                           # Local store directory (identity seeds)
└── tests/
    ├── unit/lib/                 # One suite per lib module
    └── integration/
        ├── api.test.js           # HTTP route tests
        └── app-forwarding.test.js # The Gateway against real app runtimes
```

## Next steps

- [Run the Gateway](../../../docs/guides/gateway/run.md)
- [Secure the site](../../../docs/guides/security/index.md): admit this Gateway to Kernel and lock down the fleet
- [Add routes with apps](../../../docs/guides/gateway/apps.md)
- Browse the [supported apps reference](../../../docs/reference/supported-apps.md)
- See a complete [worked example](../../../examples/mvp-site/README.md)
- Browse the [`startGateway()` options](../mdk/README.md)
- Reach MDK over MCP — run the standalone [`@tetherto/mdk-mcp`](../mcp/README.md) process (`mdk run mcp`), which derives
  tools from this Gateway's own plugins without the Gateway hosting any MCP code itself
- Skip the HTTP surface and plugin system entirely by [connecting to Kernel directly](../client/README.md) with
  `@tetherto/mdk-client` — viable for a background service that only dispatches commands, though most applications build on the Gateway
