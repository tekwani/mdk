---
title: Workers
description: Device protocol adapters that wrap APIs and expose them through the MDK Protocol
docs@tether_slug: reference/worker
todo: Ported to user docs as reference, breaks diataxis
---

# Workers

Workers are device protocol adapters for MDK. Each Worker wraps a specific API, such as a hardware vendor's API, and exposes it through the 
MDK Protocol, allowing Kernel to discover, query, and command it without knowing anything about the underlying hardware or business
logic.

## Worker categories

Workers are organized by categories, for example:

| Directory | Description |
|-----------|-------------|
| [`miners/`][miners-readme] | Bitcoin ASIC miners — Whatsminer, Antminer, Avalon |
| [`containers/`][containers-readme] | Mining container orchestration — Antspace, Bitdeer |
| [`minerpools/`][minerpools-readme] | Pool API integrations — Ocean, F2Pool |
| [`power-meter/`][power-meter-readme] | Power metering — ABB, SATEC, Schneider |
| [`temperature/`][temperature-readme] | Temperature/humidity sensors — Seneca |

## How Workers fit into MDK

```text
Kernel
  │
  │  Hyperswarm HRPC (MDK Protocol envelopes)
  ▼
`WorkerRuntime`  ──┐
                 │ hosts
Worker Plugin  ────┘
  │
  │  Vendor protocol (TCP, HTTP, Modbus, Serial, …)
  ▼
Physical Hardware
```

Workers never initiate communication to Kernel. Kernel obtains each Worker's RPC public key through [DHT, local-directory,
or same-process discovery][deployment-topology], then initiates all MDK Protocol calls to the Worker over HRPC.

## Worker architecture

Each Worker has:

- **A [Worker Plugin](#1-worker-plugin)**, e.g. [`antminer/plugin/index.js`][antminer-plugin-index]. A plain object
`{ contract, dir, connect, disconnect? }` — no base class, no subclassing
- **A [`WorkerRuntime`](#2-workerruntime)**, the shared runtime that hosts the plugin's devices and exposes them through the MDK Protocol over HRPC
- **A [`mdk-contract.json`](#3-mdk-contractjson)**, e.g. the [Antminer contract][antminer-contract], the engineering 
source of truth. Declares every telemetry field
(name, unit, type) and every command (name, params)
- **A [mock server][mdk-e2e-server]**, a local HTTP server with canned responses for hardware-free development

### 1. Worker Plugin

The plugin is the object `WorkerRuntime` is constructed with — the contract, the plugin's own directory, and a
`connect` function that turns one device's config into the `device` object every handler sees. There is no
base class and no subclassing; a plugin package can be built and tested with zero dependency on `WorkerRuntime`.
Every telemetry/command handler is invoked as `(ctx, params)`, where `ctx = { deviceId, device, config, services }`.

```text
miners/whatsminer/
  plugin/
    index.js               # the Worker Plugin: { contract, dir, connect, disconnect }
    mdk-contract.json
    boot.js                # startWhatsminerWorker(opts) — constructs WorkerRuntime
  lib/whatsminer.js         # the device driver plugin.connect() returns
```

### 2. WorkerRuntime

[`WorkerRuntime`][mdk-worker-runtime] hosts every device behind one HRPC channel to Kernel. It:
- Starts a Hyperswarm RPC server and responds to every MDK Protocol action
- Provides the RPC public key (`getPublicKey()`) that the host process registers or publishes according to the selected discovery mode
- Dispatches incoming MDK Protocol actions to the plugin's per-device handlers, wrapping results into the protocol envelope itself
- Persists the DHT/RPC keypair in a process-owned store when one is supplied (stable identity across restarts)

<details>
<summary>Migrating from MDKWorkerAdapter / ThingManager (pre-0.5.0)</summary>

`WorkerRuntime` generalizes the former `MDKWorkerAdapter` (persistent seeds, single HRPC respond loop, DHT topic
announce carried over) and replaces `ThingManager` delegation with per-device handler dispatch. See
[Worker Runtime legacy services][worker-runtime-legacy-services] for the full
migration history and the optional `opts.services` built-in surface that lets a host answer legacy queries and
commands from a manager's store.

</details>

### 3. mdk-contract.json

Each Worker package ships an [`mdk-contract.json`][contract-schema] that declares its full capabilities:
- **metadata** — provider, device family, brand, supported models
- **capabilities.telemetry** — metric fields with types, units, and descriptions
- **capabilities.commands** — available commands with parameters, constraints, and AI workflow examples
- **capabilities.health** — supported states, alert types, troubleshooting rules
- **capabilities.errors** — error code → description mapping

Kernel fetches this contract once via `capability.request` and caches it. The Gateway and AI agents use it to derive available operations dynamically.

## Start a Worker

Each Worker package ships its own boot function that constructs `WorkerRuntime` internally — there is no single
generic `startWorker()` entry point:

```js
const { getKernel } = require('@tetherto/mdk')
const { startWhatsminerWorker } = require('@tetherto/mdk-worker-whatsminer')

const kernel = await getKernel()

const worker = await startWhatsminerWorker({
  workerId: 'whatsminer-rack-1',
  model: 'm56s',
  storeDir: './store/whatsminer-rack-1',
  seedDevices: [{
    info: { serialNum: 'WM-001' },
    opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`; add a device to an already-running Worker with the
`registerThing` command instead (see each package's own `USAGE.md`, e.g. [`miners/whatsminer/USAGE.md`][whatsminer-usage]).

## Implement a new Worker

1. Read the [full build walkthrough][build-a-worker] — it covers the plugin shape, handlers, mock, tests, and hosting `WorkerRuntime` end to end
2. Look at an existing Worker of the same family as a template (e.g. `miners/whatsminer/` for a new miner)
3. Author `mdk-contract.json` following [`mdk-contract.schema.json`][contract-schema]
4. Implement the hardware translation layer (the plugin's `connect`/`disconnect` and per-field/command handlers)
5. The Worker instance boots, connects to devices, and publishes or registers its RPC public key through the selected discovery mode 
— Kernel handles the rest

## Testing

Each Worker package has its own `mock/server.js` that simulates the hardware API. Run tests from the package root:

```bash
cd backend/workers/miners/whatsminer && npm test
cd backend/workers/miners/antminer && npm test
```

## Run mock devices

Boot one or more device mocks locally — no hardware — with the Workers-level runner. Entries are
**comma-delimited**; the first token of each entry is the device **type** (case-insensitive) — or,
for a type-less device such as `ocean`/`f2pool`, its name. Flags are **dash-free** so npm forwards
them with no `--`: a bare number is the port, and `key=value` sets any other flag:

```bash
npm run mock m56s, ocean
npm run mock b23 4009 host=127.0.0.1 mockControlPort=5009, pm180 4008
```

Run `npm run mock` with no arguments to list every device and its types. A single Worker package can
also run just its own mock on its default port, e.g. `cd miners/whatsminer && npm run mock m56s`.

## Next steps

- Build a [minimal dashboard on top of a Worker][minimal-dashboard]
- Understand the [install pattern any Worker follows][install-pattern]
- Build a full [Worker for new hardware][build-a-worker]

## Links

[miners-readme]: ./miners/README.md
<!-- docs@tether.io: miners-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/README.md -->

[containers-readme]: ./containers/README.md
<!-- docs@tether.io: containers-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/containers/README.md -->

[minerpools-readme]: ./minerpools/README.md
<!-- docs@tether.io: minerpools-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/minerpools/README.md -->

[power-meter-readme]: ./power-meter/README.md
<!-- docs@tether.io: power-meter-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/power-meter/README.md -->

[temperature-readme]: ./temperature/README.md
<!-- docs@tether.io: temperature-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/temperature/README.md -->

[minimal-dashboard]: ../../docs/tutorials/build-a-dashboard.md
<!-- docs@tether.io: minimal-dashboard → tutorials/build-a-dashboard -->

[install-pattern]: docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[build-a-worker]: ../../docs/guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[antminer-plugin-index]: ./miners/antminer/plugin/index.js
<!-- docs@tether.io: antminer-plugin-index → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/plugin/index.js -->

[antminer-contract]: ./miners/antminer/plugin/mdk-contract.json
<!-- docs@tether.io: antminer-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/plugin/mdk-contract.json -->

[mdk-e2e-server]: ./miners/antminer/mock/server.js
<!-- docs@tether.io: mdk-e2e-server → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/mock/server.js -->

[mdk-worker-runtime]: ../core/mdk-worker/lib/worker-runtime.js
<!-- docs@tether.io: mdk-worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime.js -->

[contract-schema]: ../core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[deployment-topology]: ../../docs/concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[worker-runtime-legacy-services]: ../../docs/reference/maintainers/worker-runtime-legacy-services.md
<!-- docs@tether.io: worker-runtime-legacy-services → https://github.com/tetherto/mdk/blob/main/docs/reference/maintainers/worker-runtime-legacy-services.md -->

[whatsminer-usage]: ./miners/whatsminer/USAGE.md
<!-- docs@tether.io: whatsminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/USAGE.md -->