# Worker install pattern

Every Worker package in this workspace ships the same shape. Per-manufacturer specifics live in each Worker's own `USAGE.md`.

## What a Worker package contains

```
backend/workers/<family>/<provider>/
  index.js              # exports the manager classes (one per device model)
  lib/                  # manager implementations + protocol translation
  mock/server.js        # local HTTP server mimicking the vendor's device API
  mock/initial_states/  # canned responses the mock returns
  config/*.json.example # config templates copied by setup-config.sh
  setup-config.sh       # copies *.example -> active config files
  mdk-contract.json     # runtime contract: metadata, telemetry, commands, errors
  tests/                # unit + integration tests
  package.json          # vendor-specific deps
  USAGE.md              # this package's install/run notes (per-package)
  examples/             # runnable scenarios per the qvac model
```

The contract — [`mdk-contract.json`](../../workers/miners/avalon/plugin/mdk-contract.json) is the engineering source of truth for telemetry units, command 
shapes, and supported models. 

## The two ways to run a Worker

### As a library, in your own Node process

The canonical SDK shape. There is no single generic `startWorker(WorkerClass, opts)`: each Worker package ships its own boot
function that constructs a [`WorkerRuntime`](../../core/mdk-worker/lib/worker-runtime.js) and seeds devices from `opts.seedDevices`:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const kernel = await getKernel()

const { runtime } = await startAvalonWorker({
  workerId: 'avalon-rack-1',
  model: 'a1346',
  storeDir: './data/avalon',
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{
    id: 'AV-001',
    opts: { address: '127.0.0.1', port: 14030, password: 'admin' }
  }]
})

await kernel.registerWorker(runtime.getPublicKey())
```

`allowedKeys` is required: the Worker refuses to start without the Kernel's client key (`ERR_WORKER_ALLOWED_KEYS_REQUIRED`).
The [Avalon](../../../docs/guides/miners/run-avalon-worker.md), [Antspace](../../../docs/guides/containers/run-antspace-worker.md)
and [Bitdeer](../../../docs/guides/containers/run-bitdeer-worker.md) guides run this shape against each Worker's mock.
The per-package `USAGE.md` documents which boot function a given Worker exports, its `model` values, and the `opts` it needs.

### Standalone via [`worker.js`](../../core/mdk/worker.js)

The core SDK ships [`backend/core/mdk/worker.js`](../../core/mdk/worker.js): a shared process entry compatible with pm2, Docker, or `node worker.js` 
directly. It is driven by environment variables, not CLI flags — [`utils/service-bootstrap.js`](../../core/mdk/utils/service-bootstrap.js) reads `SERVICE` 
(and, for a Worker, `WORKER`/`TYPE`/`RACK`, plus `MDK_REPO_ROOT` naming the MDK source checkout) and bootstraps the matching manager.
A Worker started this way joins the DHT topic, and the Kernel admits it only if its RPC key is in `discovery.workerKeys` (or
`discovery.allowAnyWorker: true` is set for development). (The only `--wtype` in play is the one it passes when spawning the Gateway's own Worker;
miner Workers run with a fixed internal `wtype`.)

Choosing this over the library shape is a deployment-topology decision, not just "for production": running each service as its own OS process
(under pm2 or Docker) is what lets a supervisor allocate resources per process/container, restart or scale one Worker independently, and keep a
Worker crash from taking down its siblings or the Gateway. The library shape instead runs everything in one Node heap (lower footprint, simplest). 
See [`docs/concepts/deployment-topologies.md`](../../../docs/concepts/deployment-topologies.md) for the full trade-off.

## Run a mock device

Every Worker bundles a mock server next to its real-device code. From the repo root, `npm run mock` starts any of them by
type, with the port as a bare number (run it with no arguments to list every device and its types):

```bash
npm run mock a1346 14030
```

To run the same mock directly:

```bash
node backend/workers/miners/avalon/mock/server.js --port 14030 --type a1346
```

Or programmatically:

```js
const avMock = require('@tetherto/mdk-worker-avalon/mock/server')
avMock.createServer({ port: 14030, host: '127.0.0.1', type: 'a1346', serial: 'AV-001' })
```

The mock binds an HTTP server that answers the vendor's native API with canned data from `mock/initial_states/`. Per-Worker mock options (supported types,
default credentials, control port) are documented in each Worker's `USAGE.md`.

## Configuration

`setup-config.sh` copies every `config/*.example` into an active config file (strips the `.example` suffix). Pass `-t` to also seed test variants:

```bash
cd backend/workers/miners/avalon
./setup-config.sh        # copies *.example -> active
./setup-config.sh -t     # additionally seeds tests/test.*.json
```

The example files are checked in; the copied actives are gitignored, leaving room for environment-specific overrides.

## Coverage

| Worker | USAGE.md | examples | manifest entry |
| --- | --- | --- | --- |
| [`miners/avalon`](../miners/avalon/README.md) | [USAGE.md](../miners/avalon/USAGE.md) | [`avalon-dev.js`](../../../docs/guides/miners/run-avalon-worker.md) | [workers-manifest.yaml](workers-manifest.yaml) |
| containers, minerpools, power-meter, temperature | _Phase 3+_ | `npm run mock` plus the per-family guide | _Phase 3+_ |

The full model coverage for every Worker (all families) is generated from the contracts: see [`docs/supported-workers.md`](supported-workers.md).
Partner-maintained Workers (Antminer, Whatsminer) are plain contract plugins in their own repositories, hosted on
`WorkerRuntimeV2` rather than through a boot function — see [`run-antminer-worker.md`](../../../docs/guides/miners/run-antminer-worker.md).

## Next steps

- [`build-a-worker.md`](../../../docs/guides/workers/build-a-worker.md) — build your own Worker in a separate repo, for a new device family
- [`backend/core/kernel/README.md`](../../core/kernel/README.md) — the Kernel side of the install picture
- [`workers-manifest.yaml`](workers-manifest.yaml) — agent-readable manifest of variants + mock ports
- [`docs/tutorials/run-a-site.md`](../../../docs/tutorials/run-a-site.md): narrative onboarding that uses this pattern
- [`docs/reference/maintainers/agent-ready-sdk.md`](../../../docs/reference/maintainers/agent-ready-sdk.md) — the workspace-wide USAGE.md + examples 
convention this page implements
