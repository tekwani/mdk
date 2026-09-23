# @tetherto/mdk-worker

`WorkerRuntime` hosts a Worker Plugin's devices behind one HRPC channel to Kernel. Every
Worker package in this monorepo (miners, containers, power meters, temperature, minerpools, …) constructs a
`WorkerRuntime` from its own boot function; see [Workers](../../workers/README.md) for the plugin side of that
contract.

## What this package exports

```js
const { WorkerRuntime, loadPlugin, loadContract, createInstance, createModuleContext } = require('@tetherto/mdk-worker')
```

- `WorkerRuntime`: starts the Hyperswarm RPC server, dispatches MDK Protocol actions to per-device handlers, and
  persists the DHT/RPC keypair
- `loadPlugin`: loads a plugin object (`mdk-contract.json`, handlers, ...) from a directory
- `loadContract`, `createInstance`, `createModuleContext` — the loader internals `loadPlugin` composes

## Store services

A [`WorkerRuntime`](lib/worker-runtime.js) host can inject an `opts.services` object naming which of the store-backed
capabilities below to serve. When present, [`service-builtins.js`](lib/service-builtins.js) answers the matching
queries and commands directly from a host-managed persisted store — never from the plugin's device handlers. A
Worker Plugin that doesn't need any of this passes `services: null`; see
[Build a third-party Worker](../../../docs/guides/workers/build-a-worker.md)'s minimal reference implementation.

Each entry activates only when its named service exists on `opts.services`:

| Service      | Telemetry it activates  | Commands it activates | What it needs implemented         |
|--------------|-------------------------|-----------------------|-----------------------------------|
| `logHistory` | `logs`, `historical_logs`, `logs_multi` | — | `tailLog({thingId, ...})`, `getHistoricalLogs({thingId, ...})` |
| `settings`   | `settings` | `saveSettings` | `getSettings()`, `saveSettingsEntries(params)`        |
| `provisioning` | `thing_config`, `list`, `count`, `config` | `registerThing`, `updateThing`, `forgetThings` | `getThingConf`, `listDevices`, `listDeviceIds`, `registerThing`, `updateThing`, `forgetThings` |
| `stats`      | `stats` | — | `aggrStats(deviceIds, opts)` |
| `comments`   | — | `saveComment`, `editComment`, `deleteComment` | `saveThingComment`, `editThingComment`, `deleteThingComment` |
| `actions`    | `write.calls.request` (wired directly in `WorkerRuntime.handleRequest`, not through the builtin tables) | — | `getWriteCalls(payload)` |
| `pool`       | `ext_data` (scheduler-driven pool Workers) | — | `getWrkExtData({query})`           |
| `snaps`      | used only inside the `list` builtin, for `params.status` snapshot enrichment | — | `getLast(deviceId)` |

These never reach plugin handlers — they are Worker infrastructure, not device translation. When `provisioning` is
active, its `list` builtin shadows the runtime's own bare `{ deviceId, status }` device list with the fuller thing
list (`{ id, code, type, tags, info, comments, address, port, ... }`) some gateways read.

> [!IMPORTANT]
> Built-in commands must be published into the contract or the Kernel dispatcher rejects them
> (`ERR_COMMAND_NOT_IN_CAPABILITIES`) before they ever reach the runtime. [`mergeBuiltinCommands`](lib/service-builtins.js)
> handles this: it deep-clones the plugin's contract and appends one entry per *active* builtin command
> (`registerThing`, `updateThing`, `forgetThings`, `saveSettings`, `saveComment`, `editComment`, `deleteComment`) —
> the source contract is never mutated, and without `services` (or with every builtin inactive) the original contract
> reference is returned unchanged.

`allowEmptyDevices` (a `WorkerRuntime` constructor option, not a service) is the usual pairing with `provisioning`:
a fresh host boots with zero devices, takes `registerThing` writes to populate the store, and picks up the
provisioned set on its next restart. See [Build a third-party Worker](../../../docs/guides/workers/build-a-worker.md)'s
troubleshooting section for the constructor-level error (`ERR_DEVICES_REQUIRED`).

Every in-repo miner Worker (`backend/workers/miners/{avalon,antminer}/plugin/boot.js`) wires this surface through
[`createWorkerInfra`](../mdk/lib/worker-infra.js), which builds the `store`, `services`, and provisioning-first
`devices` list a `WorkerRuntime` needs, then hands the constructed `services` object straight to
`new WorkerRuntime(plugin, { ..., services, allowEmptyDevices: true })`. Reading one `boot.js` alongside this
section is the fastest way to see the whole surface exercised end to end — the pattern is identical across both
packages. (Whatsminer is a manufacturer-maintained external Worker as of 0.9.0 — see
[`backend/workers/external-workers.json`](../../workers/external-workers.json) — with no in-repo `boot.js` to
check against.)

## Errors

The plugin and contract loaders validate their inputs and throw on the first problem; the request handlers instead
return these codes on the response envelope's `error` field rather than throwing.

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_CONTRACT_DIR_REQUIRED` | `loadContract` is called without a non-empty package-directory string | Pass the plugin package directory as `pkgDir` |
| `ERR_CONTRACT_INVALID_JSON` | The package's `mdk-contract.json` cannot be parsed as JSON | Correct the JSON syntax in `mdk-contract.json` |
| `ERR_CONTRACT_NOT_FOUND` | `mdk-contract.json` cannot be read in the package directory | Ensure `mdk-contract.json` exists in the package directory |
| `ERR_DEVICE_CONFIG_INVALID` | A device spec supplies `config` that is not an object | Pass `config` as an object or omit it |
| `ERR_DEVICE_ID_DUPLICATE` | Two device specs share the same `deviceId` | Give each device a unique `deviceId` |
| `ERR_DEVICE_ID_MISSING` | A device spec has no non-empty string `deviceId` | Give every device spec a `deviceId` string |
| `ERR_DEVICE_ID_REQUIRED` | A non-metrics telemetry query or a device command arrives with no `deviceId` | Include the target `deviceId` in the request |
| `ERR_DEVICE_INSTANCE_MISSING` | A handler is invoked for a device that has no open instance | Register the device and open its instance before invoking handlers |
| `ERR_DEVICE_NOT_FOUND` | A request targets a `deviceId` the Worker does not hold | Target a `deviceId` the Worker manages |
| `ERR_DEVICE_UNAVAILABLE` | A telemetry or command request targets a device that is not online | Wait for the device to reconnect and come online before retrying |
| `ERR_DEVICES_REQUIRED` | The runtime is started with an empty or missing device list where empty is not allowed | Supply at least one device spec |
| `ERR_INSTANCE_DEVICE_ID_REQUIRED` | `createInstance` is called with a device that has no non-empty `id` | Give the device object an `id` string |
| `ERR_INSTANCE_DEVICE_REQUIRED` | `createInstance` is called without a device object | Pass a `device` object to `createInstance` |
| `ERR_INSTANCE_DIR_REQUIRED` | `createInstance` is called without a non-empty `dir` string | Pass the plugin directory as `dir` |
| `ERR_INSTANCE_ENTRIES_REQUIRED` | `createInstance` is called without an `entries` object | Pass the resolved `entries` map |
| `ERR_INSTANCE_HANDLER_LOAD_FAILED` | A handler module throws while being loaded | Fix the error inside the handler module |
| `ERR_INSTANCE_HANDLER_NOT_FOUND` | A handler file path in the contract cannot be resolved | Correct the handler path in the contract |
| `ERR_INSTANCE_HANDLER_NOT_FUNCTION` | A resolved handler module does not export a function | Export a function from the handler module |
| `ERR_MODULE_CONTEXT_DIR_REQUIRED` | The module context is created without a non-empty `dir` string | Pass a directory when creating the module context |
| `ERR_NO_DEVICE_CONTEXT` | `@tetherto/mdk-worker/device` is required outside a plugin instance | Load the plugin via `createInstance({ dir, entries, device })` so the device context exists |
| `ERR_PLUGIN_CONNECT_NOT_FUNCTION` | The plugin's `connect` is not a function | Provide a `connect` function on the plugin |
| `ERR_PLUGIN_CONTRACT_CAPABILITIES_MISSING` | The contract has no `capabilities` object | Add a `capabilities` object to the contract |
| `ERR_PLUGIN_CONTRACT_METADATA_MISSING` | The contract has no `metadata` object | Add a `metadata` object to the contract |
| `ERR_PLUGIN_CONTRACT_MISSING` | The plugin carries no contract object | Provide the plugin's contract |
| `ERR_PLUGIN_DIR_MISSING` | The plugin has no non-empty `dir` string | Set the plugin's `dir` |
| `ERR_PLUGIN_DISCONNECT_NOT_FUNCTION` | The plugin defines `disconnect` as something other than a function | Make `disconnect` a function or omit it |
| `ERR_PLUGIN_DUPLICATE_NAME` | Two entries in a contract section share a name | Give each entry in the section a unique name |
| `ERR_PLUGIN_ENTRY_NAME_MISSING` | A contract section entry has no non-empty `name` | Give every entry a `name` |
| `ERR_PLUGIN_HANDLER_MISSING` | A contract entry has no non-empty `handler` path | Set the entry's `handler` path |
| `ERR_PLUGIN_HANDLER_NOT_FOUND` | An entry's handler file cannot be required | Correct the entry's handler path |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION` | An entry's handler module does not export a function | Export a function from the handler |
| `ERR_PLUGIN_LOAD_HANDLER_NOT_FUNCTION` | `loadHandler` is provided but is not a function | Pass a function for `loadHandler` or omit it |
| `ERR_PLUGIN_REQUIRED` | `loadPlugin` is called without a plugin object | Pass a plugin object to `loadPlugin` |
| `ERR_PLUGIN_SECTION_NOT_ARRAY` | A contract capabilities section is present but is not an array | Make each capabilities section an array |
| `ERR_UNKNOWN_ACTION` | An envelope carries an action the runtime does not handle | Send a supported action |
| `ERR_UNKNOWN_COMMAND` | A command request names a command the plugin does not define | Send a command declared in the contract |
| `ERR_UNKNOWN_QUERY_TYPE` | A telemetry query names a type the plugin does not provide | Query a telemetry type declared in the contract |
| `ERR_WORKER_DIR_REQUIRED` | WorkerRuntimeV2 is started without a non-empty `dir` string | Pass the Worker package directory as `dir` |
| `ERR_WORKER_ID_REQUIRED` | The runtime is constructed without a `workerId` string | Pass a `workerId` string |

## Next steps

See:

- [`backend/core/docs/README.md`](../docs/README.md#worker-runtime-tethertomdk-worker): where this package sits
  in Core's dependency graph
- [Workers](../../workers/README.md): the plugin packages this runtime hosts
