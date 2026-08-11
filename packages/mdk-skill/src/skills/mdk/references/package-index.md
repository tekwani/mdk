# Package ↔ folder index

Load this before referencing any `@tetherto/mdk-*` package or repo path.
Use only names that appear here — inventing package names is the #1 drift
failure. Paths are relative to the monorepo root.

## Core (`backend/core/`)

| Package | Folder | What it is |
| --- | --- | --- |
| `@tetherto/mdk` | `backend/core/mdk` | Umbrella boot glue (`getKernel`, `startGateway`, `waitForDiscovery`, default topic file helpers); no generic `startWorker`, each Worker package ships its own boot function |
| `@tetherto/mdk-kernel` | `backend/core/kernel` | The Kernel (ORK): protocol layer + 8 orchestration modules |
| `@tetherto/mdk-worker` | `backend/core/mdk-worker` | Worker Runtime: `WorkerRuntime`, `loadPlugin`, contract schema |
| `@tetherto/mdk-gateway` | `backend/core/gateway` | HTTP gateway in front of the Kernel |
| `@tetherto/mdk-client` | `backend/core/client` | Consumer client library |
| `@tetherto/mdk-mcp` | `backend/core/mcp` | MCP server: exposes MDK data/actions to AI agents as tools |

Also under `backend/core/`: `plugins/` (Gateway plugin surface, no published package yet), `lib-stats/`.

## Workers (`backend/workers/`)

| Package | Folder | Device protocol |
| --- | --- | --- |
| `@tetherto/mdk-worker-whatsminer` | `backend/workers/miners/whatsminer` | CGMiner JSON over TCP (AES-encrypted) |
| `@tetherto/mdk-worker-antminer` | `backend/workers/miners/antminer` | HTTP JSON (Digest auth) |
| `@tetherto/mdk-worker-avalon` | `backend/workers/miners/avalon` | CGMiner ASCII over TCP |
| `@tetherto/mdk-worker-abb` | `backend/workers/power-meter/abb` | Modbus TCP |
| `@tetherto/mdk-worker-satec` | `backend/workers/power-meter/satec` | Modbus TCP |
| `@tetherto/mdk-worker-schneider` | `backend/workers/power-meter/schneider` | Modbus TCP |
| `@tetherto/mdk-worker-seneca` | `backend/workers/temperature/seneca` | Modbus TCP |
| `@tetherto/mdk-worker-antspace` | `backend/workers/containers/antspace` | HTTP JSON |
| `@tetherto/mdk-worker-bitdeer` | `backend/workers/containers/bitdeer` | MQTT |
| `@tetherto/mdk-worker-f2pool` | `backend/workers/minerpools/f2pool` | Pool HTTP API |
| `@tetherto/mdk-worker-ocean` | `backend/workers/minerpools/ocean` | Pool HTTP API |
| `@tetherto/mdk-worker-demo` | `backend/workers/samples/demo-worker` | HTTP JSON (canonical minimal sample) |
| `@tetherto/mdk-worker-mock` | `backend/workers/mock` | Shared device-mock framework (BaseMock, category mocks, transports) |

Generated worker docs: `backend/workers/docs/supported-hardware.md` and
`backend/workers/docs/catalogue.json` (from
`backend/workers/scripts/generate-catalogue.js`).

## UI (`ui/packages/`)

| Package | Folder | What it is |
| --- | --- | --- |
| `@tetherto/mdk-react-devkit` | `ui/packages/react-devkit` | React component toolkit; components under `src/primitives/components/` and `src/domain/components/` |
| `@tetherto/mdk-react-adapter` | `ui/packages/react-adapter` | Hooks binding components to worker/plugin data |
| `@tetherto/mdk-ui-foundation` | `ui/packages/ui-foundation` | Styling base |
| `@tetherto/mdk-ui-cli` | `ui/packages/cli` | UI scaffolding CLI (`mdk-ui-shell` template) |
| `@tetherto/mdk-fonts` | `ui/packages/fonts` | Font assets |

## Examples

| Folder | What it runs |
| --- | --- |
| `examples/full-site/` | Whole stack in one boot: mocks + Kernel + 11 workers + gateway + UI (`start.js`) |
| `examples/backend/demo-worker-caller/` | Hosts the demo Worker Plugin on `WorkerRuntime` in-process, no Kernel |

## Stale paths — do not reference

`packages/core/ork/`, `backend/core/ork/`, `backend/core/app-node/`, and `backend/workers/miners/wm-v3/` no
longer exist (ORK → Kernel and App Node → Gateway renames, and the wm-v3 removal): do not construct paths
into them. The "ThingManager / MinerManager" class architecture and the generic `startWorker(WorkerClass, opts)`
entry point are the legacy (pre-0.5.0) model; new/current workers ship their own boot function around
`WorkerRuntime` (the Worker Plugin model).
