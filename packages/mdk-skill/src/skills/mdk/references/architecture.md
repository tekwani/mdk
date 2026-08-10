# MDK architecture

Load this when you need to know which module owns a behaviour, or where a
request travels between a consumer and a physical device.

## Layers

```
Consumers (UI, CLI, agents)
    │  HTTP / @tetherto/mdk-client
Gateway (backend/core/gateway, boot glue in backend/core/mdk)
    │  MDK envelopes over HRPC
Kernel — a.k.a. ORK (backend/core/kernel)
    │  MDK envelopes over HRPC ('mdk' method), discovery via Hyperswarm DHT
Workers — WorkerRuntime hosting a Worker Plugin (backend/core/mdk-worker + backend/workers/*)
    │  vendor protocol: CGMiner TCP, HTTP JSON, Modbus TCP, MQTT…
Devices (miners, power meters, sensors, containers)
```

Historical note: the Kernel was previously called **ORK** (Orchestration
Kernel). Older docs use ORK; the code lives in `backend/core/kernel` and the
two terms are interchangeable.

## Kernel modules (`backend/core/kernel/lib/modules/`)

Each module has one job and modules never cross-call — they interact through
the interfaces they expose:

| Module | Job |
| --- | --- |
| `worker-registry` | deviceId → workerId → channel mapping; source of truth for routability; explicit state transition table |
| `command-dispatcher` | Validates a command against the worker's declared capabilities (name, param types, `min`/`max` bounds → `ERR_PARAM_RANGE`) and routes it |
| `command-state-machine` | Command lifecycle with explicit transition table; every mutation is WAL'd before it takes effect; emits `command:done` |
| `telemetry-collector` | Pull-based: sends `telemetry.pull`, returns the raw worker payload |
| `health-monitor` | Ping-based (`health.ping`); updates registry health state only |
| `scheduler` | Drives the periodic pull/ping cadences |
| `action-manager` / `action-caller` | Write-action approval lifecycle (`action.push`, `action.vote`, …) between gateway and kernel |

The protocol layer (`backend/core/kernel/lib/protocol/`) owns the envelope
(`envelope.js`), the action set (`actions.js`) and per-action payload
validators (`schemas.js`) — see `protocol.md`.

## Worker side

A worker package ships a **Worker Plugin** — `plugin/index.js` exporting
`{ contract, dir, connect, disconnect? }` — plus plain device-client code in
`lib/`. It never subclasses anything and never depends on the runtime.

`WorkerRuntime` (`backend/core/mdk-worker/lib/worker-runtime.js`) is the
generic host: it loads the plugin (eagerly requiring every handler declared in
the contract), opens one frozen context `{ deviceId, device, config, services }`
per device via `connect()`, answers the `'mdk'` HRPC method by dispatching
envelopes to handlers, and announces itself on the Kernel's DHT topic. One
runtime hosts N same-type devices; a device whose `connect()` fails is held
`offline` (requests return `ERR_DEVICE_UNAVAILABLE`) without affecting
siblings. Details: `../../mdk-device-worker/references/worker-base-api.md`.

## Discovery and request flow

1. A caller boots `WorkerRuntime` with a `kernelTopic`; the runtime joins that
   Hyperswarm topic in server mode and writes its HRPC public key to every
   incoming connection.
2. The Kernel connects to topic peers, learns the worker's key, then sends
   `identity.request` and `capability.request`; the registry records the
   worker's devices and its published contract (handler paths stripped).
3. The scheduler then drives `telemetry.pull` / `state.pull` / `health.ping`
   on a cadence; consumers trigger `command.request` through the gateway.
4. Commands flow gateway → dispatcher (capability + bounds validation) →
   state machine (WAL) → worker → `command.result` back up.

## Where things run

`examples/full-site/start.js` boots the whole picture in one process tree:
mock devices, Kernel, 11 real workers, gateway and UI. Worker-hosting caller
for a single worker, in-process and no Kernel:
`examples/backend/demo-worker-caller/index.js`.
