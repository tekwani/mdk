# @tetherto/mdk-core

## Overview

Bootstrap utilities for MDK. This package is the primary entry point for application developers. It provides
high-level convenience functions that wire together the [Kernel](../kernel/README.md), [device Workers](../../workers/README.md),
and the [Gateway](../gateway/README.md) HTTP server without requiring direct knowledge of lower-level APIs.

## Prerequisites

- Node.js >= 24

## Install

This package is part of the MDK monorepo and requires both core and Worker dependencies. After cloning, install from the repo root:

```bash
npm install
```

The [run a mining site tutorial](../../../docs/tutorials/run-a-site.md) is the full clone-and-install walkthrough.

## Usage

```js
const { getKernel, startGateway, waitForDiscovery, shutdown } = require('@tetherto/mdk-core')
const { startAntminerWorker } = require('@tetherto/mdk-worker-antminer')

// 1. Start Kernel
const kernel = await getKernel()

// 2. Start a Worker: each Worker package ships its own boot function that
//    constructs a WorkerRuntime internally (see @tetherto/mdk-worker)
const { runtime } = await startAntminerWorker({
  workerId: 'antminer-rack-1',
  model: 's19xp',
  storeDir: './data/antminer',
  seedDevices: [{ info: { serialNum: 'AM-001' }, opts: { address: '192.168.1.20', port: 80, username: 'root', password: 'root' } }]
})

// 3. Register the Worker with Kernel (same-process mode, no DHT/local discovery needed)
await kernel.registerWorker(runtime.getPublicKey())

// 4. Wait for Kernel to discover and register the Worker
await waitForDiscovery(kernel)

// 5. Optionally start the HTTP API
const server = await startGateway({ kernel, port: 3000 })

// In tests or scripts where SIGINT is not fired:
// await shutdown(kernel)
```

> [!NOTE]
> - There is no single generic `startWorker(WorkerClass, opts)` entry point: every Worker package supplies its own
> boot function that [builds a `WorkerRuntime` for its plugin](#start-a-worker).
> - [Worker deployment options](../../../docs/concepts/deployment-topologies.md) include same-process, local, and DHT.

## API

### `getKernel(opts?)` → `Promise<KernelManager>`

Start the Kernel with defaults suited for single-process development. Automatically:
- In DHT mode, reads the topic from `DEFAULT_TOPIC_FILE` or generates one if absent
- In local mode, watches a shared Worker-key directory and does not create or join a DHT topic
- Publishes the HRPC public key as hex to `DEFAULT_KEY_FILE` after start, so out-of-process clients can connect without configuration
- Registers signal handlers for graceful shutdown

The key file is not deleted on shutdown: the key is stable across restarts (HRPC seeds persist in the Kernel store), so a leftover
file stays correct for the same store directory.

```js
const kernel = await getKernel()
// kernel.topic — hex DHT topic used, or undefined in local mode
// kernel.getPublicKey() — HRPC public key
```

| Option | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `opts.root` | Optional | `string` | `os.tmpdir()/mdk` | Data root directory |
| `opts.storeDir` | Optional | `string` | Under `opts.root` | Override Hyperbee store path |
| `opts.discovery` | Optional | `object` | DHT mode | Discovery config: `{ mode: 'dht' \| 'local', dir? }` |
| `opts.topic` | Optional | `string` | Read from `opts.topicFile` if it exists, else a fresh random topic (not persisted) | 32-byte hex DHT topic; overrides the topic file |
| `opts.topicFile` | Optional | `string` | `DEFAULT_TOPIC_FILE` | Path to the topic file |
| `opts.keyFile` | Optional | `string\|false` | `DEFAULT_KEY_FILE` | Path for the HRPC key file; `false` to disable publishing |
| `opts.hrpc` | Optional | `object\|false` | Enabled, empty allowlist | HRPC config |
| `opts.telemetryPullMs` | Optional | `number` | The Kernel's own default | Telemetry poll interval in ms |
| `opts.healthPingMs` | Optional | `number` | The Kernel's own default | Health ping interval in ms |

Cadence options are flat on `getKernel()`. For nested `cadences` configuration, including `statePullMs`, use the
[`createKernel()` API](../kernel/README.md#createkernelopts--kernelmanager).

### Start a Worker

There is no generic `startWorker(WorkerClass, opts)` export in this package. Each Worker package (e.g.
`@tetherto/mdk-worker-antminer`) supplies its own boot function that constructs a
[`WorkerRuntime`](../mdk-worker/lib/worker-runtime.js) internally and connects it to Kernel through [DHT, local, or
same-process discovery](../../../docs/concepts/deployment-topologies.md). Every boot function accepts (`kernelTopic`, `discovery`,
or direct `kernel.registerWorker(runtime.getPublicKey())`).

```js
const { startAntminerWorker } = require('@tetherto/mdk-worker-antminer')

const { runtime, stop } = await startAntminerWorker({
  workerId: 'antminer-rack-1',   // one runtime process = one workerId
  model: 's19xp',
  storeDir: './data/antminer',
  kernelTopic: null,               // omit/null to register by key instead of a DHT topic
  seedDevices: [{ info: { serialNum: 'AM-001' }, opts: { address: '192.168.1.20', port: 80, username: 'root', password: 'root' } }]
})

await kernel.registerWorker(runtime.getPublicKey()) // same-process discovery
```

Returns vary by Worker package, but every boot function returns at least `{ runtime, stop }`: `runtime` is the
`WorkerRuntime` instance (`getPublicKey()`, `getDeviceContext(deviceId)`); `stop()` tears the Worker down.

### `startGateway(opts?)` → `Promise<WrkServerHttp>`

Start the Fastify-based HTTP server. Writes config files under `opts.root`, deep-merging any override objects
with the example defaults.

```js
const server = await startGateway({
  kernel,
  port: 3000,
  root: './data/gateway'
})
```

| Option | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `opts.root` | Optional | `string` | `os.tmpdir()/mdk/gateway` | Config/data root |
| `opts.port` | Optional | `number` | `3000` | HTTP port |
| `opts.env` | Optional | `string` | `'development'` | Environment string |
| `opts.kernel` | Optional, one of `opts.kernel`/`opts.kernelKey`/`opts.keyFile` must resolve a key | `KernelManager` | None | Kernel instance; Gateway stop is registered on cleanup. Its `getPublicKey()` also resolves the Kernel key. |
| `opts.kernelKey` | Optional, see `opts.kernel` | `string\|Buffer\|false` | None | Kernel HRPC listener public key (hex or Buffer); `false` to run without a Kernel connection. Each plugin's own `mdkClient` still builds, but fails per call with [`ERR_MDK_CLIENT_UNAVAILABLE`](../client/README.md#createmdkclientconfig-opts--auto-connecting-client). |
| `opts.keyFile` | Optional, see `opts.kernel` | `string` | `DEFAULT_KEY_FILE` | Key file to resolve the Kernel key from |
| `opts.bootstrap` | Optional | `array` | None | DHT bootstrap nodes threaded to each plugin's own client (testnets) |
| `opts.common` | Optional | `object` | `{}` | Overrides for `common.json` |
| `opts.httpd` | Optional | `object` | `{}` | Overrides for `httpd.config.json` |
| `opts.store` | Optional | `object` | `{}` | Overrides for `store.config.json` |
| `opts.additionalRoutes` | Optional | `array` | None | Extra Fastify route definitions; a raw escape hatch, prefer `extraPluginDirs` |
| `opts.extraPluginDirs` | Optional | `array` | None | The complete set of plugin package directories this Gateway loads — nothing else is registered. See [Plugins MDK ships](#plugins-mdk-ships) |

### Plugins MDK ships

`opts.extraPluginDirs` is the whole list. `telemetry`, `site-hashrate` and `site-monitor` ship in
`@tetherto/mdk-plugins`; ask for one by name:

#### `bundledPluginDir(name)`

Resolves the directory of a plugin `@tetherto/mdk-plugins` ships, so a caller need not know where npm put it or that it is
a subdirectory rather than a package of its own. Throws `ERR_BUNDLED_PLUGIN_NOT_FOUND`, listing what is available, if the
name is not one of them.

```js
const { startGateway, bundledPluginDir } = require('@tetherto/mdk-core')

await startGateway({
  kernel,
  port: 3847,
  extraPluginDirs: [
    bundledPluginDir('telemetry'),
    bundledPluginDir('site-monitor'),
    path.join(__dirname, 'plugins', 'site')
  ]
})
```

In `mdk.yaml` the same thing is a package subpath — `package: "@tetherto/mdk-plugins/telemetry"` — which `mdk run`
resolves to this directory.

The Kernel HRPC key is resolved **before any boot side effects**, in this order:

1. `opts.kernelKey`: hex or Buffer; `false` means run without a Kernel connection.
2. `opts.kernel.getPublicKey()`: in-process Kernel handle.
3. Key file: `opts.keyFile` or `DEFAULT_KEY_FILE`.
4. Otherwise throws: `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

The resolved key lands in each plugin's context; the Gateway worker itself opens no Kernel connection — each plugin builds its own
[`@tetherto/mdk-client`](../client/README.md) from that key, and a failed connect fails that plugin's calls with
[`ERR_MDK_CLIENT_UNAVAILABLE`](../client/README.md#createmdkclientconfig-opts--auto-connecting-client) so as not to crash the HTTP server.

### `startKernel(opts?)` → `Promise<KernelManager>`

Lower-level Kernel start. Prefer `getKernel()` for new code. Does not register SIGINT or read the topic file, and writes the key file only when
`opts.keyFile` is explicitly passed.
For caller-managed construction and lifecycle, use [`createKernel()` from `@tetherto/mdk-kernel`](../kernel/README.md#createkernelopts--kernelmanager).

### `waitForDiscovery(kernel, timeout?)` → `Promise<WorkerEntry[]>`

Poll the registry until at least one Worker reaches `READY` state with devices populated, or `timeout` ms elapses
(default: 30 000 ms). Returns the full list of registered Workers.

```js
await waitForDiscovery(kernel, 15000)
const workers = kernel.registry.listWorkers()
```

### `onShutdown(cleanupFn, opts?)` → handler

Register a one-shot cleanup handler on `SIGINT` / `SIGTERM`. Returns the handler so tests can invoke it directly.

| Option | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `opts.signals` | Optional | `string[]` | `['SIGINT', 'SIGTERM']` | Signals to listen for |
| `opts.forceMs` | Optional | `number` | `3000` | Force-exit timeout in ms if cleanup hangs |

> [!NOTE]
> `getKernel()`, `startGateway()`, and every Worker boot function register their own `onShutdown`
> handlers internally. Call this only when you need to add teardown logic outside
> a boot handle — for example, closing a database or flushing a log buffer.

### `shutdown(handle)` → `Promise<void>`

Gracefully stop any MDK boot handle — Kernel, Gateway, or Worker. Drains the handle's `_cleanup` array in registration order,
then calls `.stop()` on the handle itself. Idempotent: calling `shutdown` twice on the same handle is safe.

```js
await shutdown(kernel) // stops Gateway and Workers (chained), then stops Kernel
```

Prefer `shutdown(kernel)` over calling `shutdown` on each handle separately: passing the Kernel handle tears everything down in the
order services were started.

### Constants

```js
const { DEFAULT_TOPIC_FILE, DEFAULT_KEY_FILE } = require('@tetherto/mdk-core')
// DEFAULT_TOPIC_FILE — os.tmpdir()/mdk/.dht-topic
// DEFAULT_KEY_FILE   — os.tmpdir()/mdk/.kernel-key (Kernel HRPC public key, hex)
```

## Single-process full stack

The typical pattern for running everything in one process during development:

```js
const { getKernel, startGateway, waitForDiscovery } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')
const { startAntminerWorker } = require('@tetherto/mdk-worker-antminer')

async function main () {
  const kernel = await getKernel()

  const { runtime: av } = await startAvalonWorker({
    workerId: 'avalon-rack-1',
    model: 'a1346',
    storeDir: './data/avalon',
    seedDevices: [{ info: { serialNum: 'AV-001' }, opts: { address: '192.168.1.10', port: 4028, password: 'admin' } }]
  })
  await kernel.registerWorker(av.getPublicKey())

  const { runtime: am } = await startAntminerWorker({
    workerId: 'antminer-rack-1',
    model: 's19xp',
    storeDir: './data/antminer',
    seedDevices: [{ info: { serialNum: 'AM-001' }, opts: { address: '192.168.1.20', port: 80, username: 'root', password: 'root' } }]
  })
  await kernel.registerWorker(am.getPublicKey())

  await waitForDiscovery(kernel)

  await startGateway({ kernel, port: 3000 })
  console.log('MDK running at http://localhost:3000')
}

main()
```

## Config management

`startGateway()` and each Worker's boot function copy example config files into their `opts.root/config/` (or `storeDir`) on first run.
After that, the files are left untouched so your edits survive restarts. Pass override objects to `startGateway()` to programmatically
set specific values without editing files.

Config file precedence:
1. Existing file on disk (your edits are authoritative).
2. Deep-merged overrides from `opts.*`.
3. `.example` template from the package.

## Errors

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_ALERTS_LOGS_REQUIRED` | AlertsService is constructed without a `logs` instance | Pass the logs service in the AlertsService constructor options |
| `ERR_BEE_LOG_META_NOTFOUND` | A log key is rotated but has no meta record to advance | Initialize the log meta before rotating, or rotate only known log keys |
| `ERR_BEE_ROTATED_LOG_META_NOTFOUND` | A corrupted time log is rotated but its new meta cannot be read back | Inspect the log store for corruption and rebuild the affected log key |
| `ERR_BUNDLED_PLUGIN_NOT_FOUND` | `bundledPluginDir` is asked for a plugin the `@tetherto/mdk-plugins` package does not ship | Name one of the bundled plugins the error lists |
| `ERR_COMMENT_ACCESS_DENIED` | A comment edit or delete is requested by a user who is not the comment's author | Perform the edit or delete as the user who created the comment |
| `ERR_CRON_UNSUPPORTED` | A cron expression's minute and hour fields do not map to a supported interval | Use a `*/n` minute, `*/n` hour, or `0 0` daily form |
| `ERR_DEVICE_TYPE_REQUIRED` | `createWorkerInfra` is called without `opts.deviceType` | Pass a `deviceType` string in the Worker infra options |
| `ERR_DEVICE_UNAVAILABLE` | A device call targets a `deviceId` that has no live runtime context | Register and bind the device before calling it |
| `ERR_END_INVALID` | A DB range read is requested without an `end` bound | Supply an `end` timestamp in the query |
| `ERR_ENTRIES_INVALID` | Settings are saved with an entries argument that is not an object | Pass an object of key/value settings entries |
| `ERR_HIST_LOG_NOTFOUND` | A history log is read but does not parse to an array of entries | Check that the log key holds valid history entries |
| `ERR_INFO_HISTORY_LOG_NOTFOUND` | An `info` historical-logs request finds no `thing-history-log` time log | Confirm info-history logging is enabled and the log exists |
| `ERR_INFO_HISTORY_LOG_TYPE_INVALID` | A historical-logs request omits `logType` | Set `logType` to `alerts` or `info` |
| `ERR_INVALID_ARG_TYPE` | Miner pool pre-processing is given a `pools` value that is not an array | Pass pools as an array |
| `ERR_INVALID_GROUP_RANGE_FORMAT` | A group-range string does not match the `<number><H\|D\|W\|M>` pattern | Use a range like `1H`, `1D`, `1W` or `1M` |
| `ERR_KERNEL_KEY_FILE_NOT_FOUND` | `startGateway` cannot resolve a Kernel key from options or the key file | Start the Kernel first, pass `opts.kernelKey` or `opts.kernel`, or set `kernelKey: false` to run without a Kernel |
| `ERR_KEY_INVALID` | A Worker external-data request has a query with no `key` | Include a `key` in the query |
| `ERR_LOG_HISTORY_LOGS_REQUIRED` | LogHistoryService is constructed without a `logs` instance | Pass the logs service in the constructor options |
| `ERR_LOG_KEY_NOTFOUND` | `tailLog` is called without `req.key` | Provide the log `key` in the request |
| `ERR_LOG_NOTFOUND` | A requested time log is absent. This covers the `alerts` historical log and any `tailLog` `key`-`tag` log. | Confirm the log key exists and data has been written to it |
| `ERR_LOG_TAG_INVALID` | `tailLog` is called without `req.tag` | Provide the log `tag` in the request |
| `ERR_LOGS_META_LOGS_REQUIRED` | LogsService is constructed without a `metaLogs` store | Pass a `metaLogs` store in the constructor options |
| `ERR_LOGS_STORE_REQUIRED` | LogsService is constructed without a `store` | Pass a `store` in the constructor options |
| `ERR_MDK_REPO_ROOT` | Service bootstrap cannot locate a repo root containing `backend/core/mdk` within ten parent directories | Run the bootstrap from inside the monorepo tree |
| `ERR_MDK_SERVICE_ENV` | The `SERVICE` env var is unset | Set `SERVICE` to `gateway` or `worker` |
| `ERR_MDK_SERVICE_UNKNOWN` | `SERVICE` is set to something other than `gateway` or `worker` | Set `SERVICE` to `gateway` or `worker` |
| `ERR_MDK_WORKER_ENV` | A Worker is started without both `WORKER` and `RACK`, or a non-pool Worker is started without `TYPE` | Set `WORKER` and `RACK`, and set `TYPE` for non-pool Workers |
| `ERR_MDK_WORKER_EXPORT` | The resolved Worker package does not export the expected factory function | Check the Worker package exports the factory named in its boot spec |
| `ERR_MDK_WORKER_UNKNOWN` | The `WORKER` name has no runtime boot entry, or the `WORKER`+`TYPE` pair has no plugin model | Use a known Worker name and a `TYPE` its boot spec defines |
| `ERR_NO_IMPL` | An abstract Thing or Container method is called on a class that has not overridden it | Implement the method on the concrete device class |
| `ERR_PROC_RACK_UNDEFINED` | PoolService is constructed with a context that has no `rack` | Pass `ctx.rack` when constructing the pool service |
| `ERR_PROVISIONING_DB_REQUIRED` | DeviceProvisioningService is constructed without a `db` | Pass a `db` in the constructor options |
| `ERR_PROVISIONING_DEVICE_TYPE_REQUIRED` | DeviceProvisioningService is constructed without a `deviceType` string | Pass a non-empty `deviceType` string |
| `ERR_QUERY_INVALID` | A Worker external-data request has no `query` | Include a `query` object in the request |
| `ERR_RUNTIME_NOT_BOUND` | A device call runs before the runtime device-context getter is bound | Bind the runtime (start the Worker infra) before making device calls |
| `ERR_SET_LED_ENABLED_INVALID` | A miner `setLED` action is given a non-boolean `enabled` | Pass `enabled` as a boolean |
| `ERR_SETTINGS_DB_REQUIRED` | SettingsService is constructed without a `settingsDb` | Pass a `settingsDb` in the constructor options |
| `ERR_SNAPS_COLLECT_SNAP_REQUIRED` | SnapsService is constructed without a `collectSnap` function | Pass a `collectSnap` function in the constructor options |
| `ERR_SNAPS_LOGS_REQUIRED` | SnapsService is constructed without a `logs` instance | Pass the logs service in the constructor options |
| `ERR_START_INVALID` | A DB range read is requested without a `start` bound | Supply a `start` timestamp in the query |
| `ERR_STATS_LOGS_REQUIRED` | StatsService is constructed without a `logs` instance | Pass the logs service in the constructor options |
| `ERR_STORE_DIR_REQUIRED` | `createWorkerInfra` is called without `opts.storeDir` | Pass a `storeDir` path in the Worker infra options |
| `ERR_SWITCH_CONTAINER_ENABLED_INVALID` | A container `switchContainer` action is given a non-boolean `enabled` | Pass `enabled` as a boolean |
| `ERR_SWITCH_COOLING_SYSTEM_ENABLED_INVALID` | A `switchCoolingSystem` action is given a non-boolean `enabled` | Pass `enabled` as a boolean |
| `ERR_SWITCH_SOCKET_ARGS_INVALID` | A `switchSocket` action's first argument is not an array of tuples | Pass socket instructions as an array |
| `ERR_SWITCH_SOCKET_ENABLED_INVALID` | A `switchSocket` tuple's `enabled` is not a boolean | Pass the tuple's `enabled` as a boolean |
| `ERR_SWITCH_SOCKET_PDU_INDEX_INVALID` | A `switchSocket` tuple's PDU index is not a string | Pass the PDU index as a string |
| `ERR_SWITCH_SOCKET_SOCKET_INDEX_INVALID` | A `switchSocket` tuple's socket index is not a string | Pass the socket index as a string |
| `ERR_THING_CODE_INVALID` | A device is registered with a `code` that does not end in `-<digits>` | Supply a code ending in a hyphen and numeric suffix, or omit it to auto-generate |
| `ERR_THING_COMMENT_NOTFOUND` | A comment edit or delete targets an `id` or `ts` that no comment on the thing matches | Reference an existing comment `id` or `ts` |
| `ERR_THING_COMMENTS_NOTFOUND` | A comment edit or delete runs on a thing that has no comments | Add a comment before editing or deleting one |
| `ERR_THING_IP_ADDRESS_EXISTS` | A device is registered or updated with an address already held by another device while duplicate IPs are disallowed | Use a unique address or enable `allowDuplicateIPs` |
| `ERR_THING_MACADDRESS_EXISTS` | A device is registered or updated with a MAC address already held by another device | Use a unique MAC address |
| `ERR_THING_NOTFOUND` | An operation references a device `id` that is not in the store | Register the device first or correct the `id` |
| `ERR_THING_POS_EXISTS` | A device is registered or updated with a position and container pair already held by another device | Use a free position within that container |
| `ERR_THING_SERIALNUM_EXISTS` | A device is registered or updated with a serial number already held by another device | Use a unique serial number |
| `ERR_THING_TAGS_INVALID` | Auxiliary tags are supplied as a value that is not an array | Pass tags as an array |
| `ERR_THING_VALIDATE_OPTS_INVALID` | A device is registered without an `opts` object | Include the device's `opts` in the registration payload |
| `ERR_THING_WITH_CODE_ALREADY_EXISTS` | A device is registered with a `code` already assigned to another device | Use a unique code or omit it to auto-generate |
| `ERR_THING_WITH_ID_ALREADY_EXISTS` | A device is registered with an `id` that already exists | Use a new `id` or omit it to auto-generate |
| `ERR_UNKNOWN_OPERATION` | Numeric aggregation is asked for an operation other than `avg` or `sum` | Use `avg` or `sum` |

## Directory layout

```text
mdk/
├── index.js              # `getKernel`, `startGateway`, `waitForDiscovery`
├── services.js           # `startServices` — facility bootstrap helpers
├── worker.js             # Worker-side entry point
├── lib/
│   ├── local-discovery.js  # `keysDir`, `publishWorkerKey`: the `discovery: { mode: 'local' }` helpers
│   ├── utils.js            # Shared helpers (isValidSnap, isOffline, etc.)
│   ├── worker-infra.js     # `createWorkerInfra` — per-Worker infra bootstrap
│   ├── services/           # One class per domain service (Actions, Alerts, Comments, LogHistory, Logs, Pool, Provisioning, Settings, Snaps, Stats)
│   │   └── pool-utils/     # Shared pool-service constants and time helpers
│   ├── templates/          # Alert and stats computation templates
│   └── things/             # Thing subclasses — Container, Miner, PowerMeter, Sensor (base: Thing)
├── utils/
│   ├── constants.js        # MDK_STORE and other well-known names
│   ├── index.js            # Facility bootstrap helpers (Intervals, Store, ActionApprover)
│   ├── initialize.js       # Service initialization helpers
│   ├── service-bootstrap.js # Spawns/manages service subprocesses
│   └── compose-yaml.js     # `buildComposeYaml` — docker-compose file generation
└── tests/
    ├── unit/                # One suite per lib/service/thing/util module
    └── integration/         # Kernel-key-file, local-discovery, actions-flow (per Worker family)
```

## Next steps

- [Run the Gateway](../../../docs/guides/gateway/run.md): programmatic and standalone startup, auth configuration, and HRPC key setup
- [Add hardware devices](../../workers/README.md): understand how Workers register devices and expose them to Kernel
- [Add custom routes with plugins](../../../docs/guides/gateway/plugins.md): extend the Gateway via `extraPluginDirs`
- [See the full-site example](../../../examples/full-site/README.md): multi-Worker, multi-device setup in a separate-process topology
- [Understand the the full MDK layer model](../../../docs/concepts/architecture.md)
