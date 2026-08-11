# Worker base API — `@tetherto/mdk-worker`

Load this when hosting a plugin, debugging envelope dispatch, or deciding what
belongs in the plugin vs the caller. Source:
`backend/core/mdk-worker/lib/worker-runtime.js` and `lib/plugin-loader.js`;
package entry `backend/core/mdk-worker/index.js` exports
`{ WorkerRuntime, loadPlugin }`.

## The plugin contract (`loadPlugin`)

A Worker Plugin is `{ contract, dir, connect, disconnect? }`:

- `contract` — the parsed `mdk-contract.json`.
- `dir` — `__dirname` of the plugin; handler paths resolve against it.
- `connect(config, { deviceId }) => device` — build (and probe) one device
  client. Throwing here holds the device `offline` without failing the boot.
- `disconnect(device, { deviceId })` — optional; close sockets etc.

`loadPlugin` **eagerly requires every handler** declared under
`capabilities.telemetry` and `capabilities.commands` — a missing file,
non-function export, missing `handler` field, or duplicate name aborts with
`ERR_PLUGIN_HANDLER_NOT_FOUND` / `ERR_PLUGIN_HANDLER_NOT_FUNCTION` /
`ERR_PLUGIN_HANDLER_MISSING` / `ERR_PLUGIN_DUPLICATE_NAME`. Nothing loads
lazily at request time. It returns
`{ contract, publishedContract, handlers, connect, disconnect }` where
`publishedContract` has all `handler` paths stripped (that copy is what
`capability.response` sends).

## Handler signature

Telemetry and command handlers are identical in shape:

```js
module.exports = async (ctx, params) => result
```

`ctx` is frozen per device: `{ deviceId, device, config, services }`.
`device` is whatever `connect()` returned; `services` is `null` unless the
caller injected worker-infra services. Handlers never see envelopes or
transport — the runtime wraps their return value (or thrown error) into the
response envelope.

## `new WorkerRuntime(plugin, opts)`

| Option | Required | Meaning |
| --- | --- | --- |
| `workerId` | yes | Identity string; `ERR_WORKER_ID_REQUIRED` otherwise |
| `devices` | yes* | `[{ deviceId, config? }]`; duplicates/missing ids throw. *`allowEmptyDevices: true` permits a device-less provisioning-first boot |
| `kernelTopic` | no | Hex string or Buffer; when set, the runtime announces on this DHT topic |
| `store` | no | Persistent store (Hyperbee-style) for the DHT/RPC seeds → stable public key across restarts; without it keys are random per boot |
| `services` | no | Worker-infra services (logs, settings, stats, comments, provisioning…). Served as built-ins ahead of plugin handlers and exposed to handlers as `ctx.services` |
| `bootstrap` | no | Custom DHT bootstrap nodes (hermetic tests use `hyperdht/testnet`) |

One runtime hosts N same-type devices behind one HRPC channel. The device
list is fixed at construction.

## Lifecycle

- `await start()` — opens device contexts (`connect` per device; failures →
  `offline`), starts the HRPC server responding on the `'mdk'` method, and —
  if `kernelTopic` is set — joins the topic in server mode, writing its public
  key to each incoming connection and re-announcing every 30 s. Returns
  `{ publicKey }`.
- `await stop()` — tears down swarm/RPC/DHT and calls `disconnect` per online
  device.
- `getPublicKey()` — HRPC public key (null before `start`).
- `getDeviceContext(deviceId)` — the frozen ctx of an *online* device, for the
  process that owns the runtime (e.g. a sampler loop); null while offline.
- `await handleRequest(envelope)` — the entire protocol surface; usable
  directly in-process for tests (no `start()` needed for identity/capability;
  device-touching actions need contexts opened by `start()`).

## Envelope dispatch (`handleRequest`)

| Action | Behaviour |
| --- | --- |
| `identity.request` | `{ workerId, devices: [{ deviceId }] }` |
| `capability.request` | `{ contract: publishedContract }` (built-in commands merged in when services are present) |
| `telemetry.pull` | `query.type` routing — see `../../mdk/references/protocol.md`. `metrics` runs every telemetry handler; a channel name runs one; `list` returns device statuses; service built-ins (`logs`, `settings`, `stats`, …) take precedence over plugin channels |
| `command.request` | Built-ins first (provisioning/store commands work for offline devices); then device must exist and be online; unknown command → `ERR_UNKNOWN_COMMAND`; handler success → `{ commandId, status: 'SUCCESS', result }`, throw → `{ status: 'FAILED', error }` |
| `health.ping` | `{ status: 'OK' }` |
| `state.pull` | `{ state: { <deviceId>: { status } }, deviceCount, workerId }` |
| `write.calls.request` | Only when `services.actions` is injected |
| anything else | `ERR_UNKNOWN_ACTION` |

Failure isolation: a handler that throws poisons only that field
(`metrics.<name> = { error }`) or that command — never the worker. An offline
device answers `ERR_DEVICE_UNAVAILABLE`; a wrong id `ERR_DEVICE_NOT_FOUND`.

## Param normalization

Legacy write paths dispatch positionally (`{ value: x }` or
`{ args: [...] }`). The runtime maps those onto your contract-declared param
names before your handler runs, so handlers only ever see named params —
provided the contract declares params accurately.

## What the runtime does NOT do

- It does not validate contracts against the JSON Schema (that's
  `../scripts/validate-contract.mjs` and the catalogue lint).
- It does not enforce param types or `min`/`max` bounds — the **Kernel's**
  dispatcher does, and only for declared bounds. In-process callers of
  `handleRequest` bypass that check (the smoke harness replicates it).
- It has no HTTP mode and no CLI — a caller process constructs it (see
  `examples/backend/demo-worker-caller/index.js`).
