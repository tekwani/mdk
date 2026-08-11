# Device families — what exists, what to copy

**Load this only when the user explicitly asks to follow the existing MDK
worker families and their structure** — typically when contributing a worker
into the MDK monorepo itself, or deliberately mirroring how a shipped family
handles its device protocol. The families below are tightly coupled to the
mining-OS use cases they were built for; a third party integrating their own
device should NOT start from them — the default starting point is
`../assets/worker-template/` (step 1 of the skill workflow).

All paths under `backend/workers/`. Every family below is a Worker Plugin
(`plugin/index.js` → `{ contract, dir, connect, disconnect? }`); production
families additionally ship `plugin/boot.js`, which wires worker-infra services
and exposes a `start<Family>Worker()` helper.

| Family | Path | Protocol | Telemetry / commands | Copy it when… |
| --- | --- | --- | --- | --- |
| **demo-worker** | `samples/demo-worker` | HTTP JSON (hypothetical firmware) | 5 / 2 | Default starting point — leanest real plugin, own SQLite history channel, standalone mock. This is `../assets/worker-template/`. |
| **whatsminer** | `miners/whatsminer` | CGMiner JSON over TCP, AES-encrypted, token auth | 13 / 6 | Encrypted/stateful TCP APIs; the only shipped contract with a bounded numeric param (`setPowerPct.pct` 0–200) |
| **antminer** | `miners/antminer` | HTTP JSON with Digest auth | 10 / 4 | HTTP devices behind auth; digest client setup in `connect` |
| **avalon** | `miners/avalon` | CGMiner ASCII over TCP | 9 / 4 | Plain-text TCP command APIs |
| **abb** | `power-meter/abb` | Modbus TCP | 9 / 0 | Modbus register maps; **multi-model**: `MODEL_CLASSES` lookup keyed off `config.model` (B23/B24/M1M20/M4M20/REU615) |
| **satec / schneider** | `power-meter/satec`, `power-meter/schneider` | Modbus TCP | read-only | Same shape as abb, single/dual model |
| **seneca** | `temperature/seneca` | Modbus TCP | 2 / 0 | Minimal read-only sensor; per-device `register` in config; fault-sentinel semantics (850.0) in the contract |
| **antspace** | `containers/antspace` | HTTP JSON | 5 / 5 | Cooling containers; model variants (hydro/immersion); approval-gated commands via `constraints` |
| **bitdeer** | `containers/bitdeer` | MQTT | — | Subscription-style transports |
| **f2pool / ocean** | `minerpools/f2pool`, `minerpools/ocean` | Pool HTTP APIs | — | Non-hardware "device" integrations |

Do **not** copy from `miners/wm-v3` (empty stub) or model anything on the
`ThingManager`/`MinerManager` class architecture in `backend/workers/README.md`
— that's the legacy pre-plugin model.

## Anatomy shared by all families

```
<family>/
├── index.js            # exports { plugin, start<Family>Worker?, <DeviceClass>? }
├── plugin/
│   ├── index.js        # the Worker Plugin
│   ├── boot.js         # production families: worker-infra hosting helper
│   ├── mdk-contract.json
│   └── src/{telemetry,commands}/*.js
├── lib/                # device client class (plain vendor I/O; multi-model families add lib/models/)
├── mock/server.js      # firmware simulator
├── config/             # sample device configs (production families)
└── tests/{unit,integration}/
```

Conventions that hold across every family:

- `connect(config, { deviceId })` validates required config keys up front
  (throwing `ERR_DEVICE_CONFIG_INVALID`-style errors), builds the device
  client, probes it once, returns it. `disconnect` exists wherever the client
  holds a socket.
- Multi-model families select a class from a `MODEL_CLASSES` map keyed by
  `config.model` / `config.type` (see abb, antspace).
- Handler files mirror contract names 1:1 under `plugin/src/`.
- Numeric safety is expressed as param `min`/`max` (whatsminer `setPowerPct`)
  or an approval `constraints` string (antspace `resetCoolingSystem`:
  "Requires two approvals."). Prefer declaring both for physical setpoints.
- Tests are brittle, split `tests/unit/` (handlers against the mock) and
  `tests/integration/` (plugin hosted end-to-end).

## The shared mock framework (`backend/workers/mock/`)

Per-family mocks are thin leaves over `@tetherto/mdk-worker-mock`:
`BaseMock` (CLI, initial-state loading, lifecycle) → category mock
(`miner.mock.js` resolves commands to `cmds/<command>.js` files,
`powermeter.mock.js` pins Modbus, `sensor.mock.js` reuses it,
`container.mock.js`, `minerpool.mock.js`) → device leaf
(`<family>/mock/server.js`, e.g. `class WhatsminerMock extends MinerMock`
with `static dir/TYPES/defaultPort` and a `createTransport()` override).
Transports live in `mock/transports/` (tcp, http, modbus, mqtt).

A standalone worker (like the template) can instead ship a self-contained
`mock/server.js` exporting `createServer(opts) → { server, state, exit }` —
that's the pattern the smoke harness and template tests use.
