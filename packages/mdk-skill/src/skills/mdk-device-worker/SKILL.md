---
name: mdk-device-worker
description: >
  Integrate a new device into MDK as a device worker. Use for any task like
  "new device / miner / power meter / sensor / container worker", "build a
  worker", "integrate hardware", "wrap a device protocol (Modbus / CGMiner /
  HTTP / MQTT)", or anything creating or editing an mdk-contract.json, a
  Worker Plugin, or telemetry/command handlers under backend/workers/.
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# Integrate a new MDK device worker

A device worker is a **Worker Plugin**: a folder exporting
`{ contract, dir, connect, disconnect? }` plus one small handler module per
telemetry channel and per command. The generic `WorkerRuntime`
(`backend/core/mdk-worker`) hosts it — you subclass nothing, and the plugin
never depends on the runtime. Workers are **site-agnostic**: they know nothing
about the site they run in, so everything here is testable locally against a
device mock before a Kernel ever exists.

The final package shape (this is `assets/worker-template/`, a verbatim copy of
`backend/workers/samples/demo-worker/`):

```
<your-worker>/
├── index.js                     # exports { plugin, ... }
├── package.json
├── smoke.config.js              # glue for scripts/worker-smoke.mjs
├── plugin/
│   ├── index.js                 # { contract, dir, connect } — the Worker Plugin
│   ├── mdk-contract.json        # single source of truth
│   ├── lib/device-client.js     # vendor-protocol I/O, no MDK concepts
│   └── src/
│       ├── telemetry/<name>.js  # one file per telemetry channel
│       └── commands/<name>.js   # one file per command
├── lib/                         # optional worker-owned persistence etc.
├── mock/server.js               # vendor firmware simulator
└── tests/unit/plugin.test.js    # brittle tests, plugin-level
```

## Workflow

### 1. Start from the worker template

The default starting point for every new worker is `assets/worker-template/`
— a complete minimal Worker Plugin (contract + connect + handlers + mock +
tests) with no assumptions about your device category.

Do **not** model a new worker on the MDK monorepo's shipped device families
(whatsminer, antminer, abb, seneca, …) by default — those are tightly coupled
to the mining-OS use cases they were built for and won't map onto your device.
Only when the user **explicitly asks** to follow the existing MDK worker
families and their structure (e.g. contributing a worker into this monorepo,
or deliberately mirroring a shipped family's protocol handling) should you
read `references/device-families.md` and copy from the named family instead.

### 2. Scaffold

Copy `assets/worker-template/` to your worker's location and rename the
demo-specific parts (contract metadata, device-client methods, mock behavior,
tests). Drop what your device doesn't need — e.g. the template's own SQLite
persistence (`lib/db.js` + the `history` telemetry channel) is optional; the
required plugin surface is only contract + `connect` + handlers. Remember to
adapt `smoke.config.js` (mock boot, device config, sample command params) and
`package.json` (name, description). The plugin is location-independent — put
the package wherever your project keeps packages. (Only workers contributed
to the MDK monorepo itself follow its
`backend/workers/<category>/<family>/` layout.)

### 3. Author `mdk-contract.json`

Start from `assets/mdk-contract.template.json`; the field-by-field guide is
`references/contract-authoring.md` — load it now. Non-negotiables:

- Every telemetry/command entry needs a `handler` path (`src/telemetry/x.js`)
  — the loader hard-fails without it.
- **Every `number` command param must declare `min` and `max`.** The Kernel
  enforces bounds only when declared (`ERR_PARAM_RANGE`); an undeclared bound
  is an unprotected physical setpoint.
- Read-only devices (meters, sensors) declare `"commands": []`.
- `description` / `overview` / `constraints` are simultaneously machine docs
  and AI operator context — write real semantics ("If 0, device is booting"),
  and put safety thresholds in the contract, not in code comments.

### 4. Validate the contract — loop until clean

```
node <this-skill>/scripts/validate-contract.mjs <worker>/plugin/mdk-contract.json
```

Validates against `references/mdk-contract.schema.json` plus semantic
checks (handler files exist, no duplicate names, numeric params bounded).
Fix and re-run until it exits 0. Handler files must exist first — stubs from
the template are enough at this stage.

### 5. Build the mock, then the device client

Write `mock/server.js` first — a standalone simulator of the vendor firmware
API that knows nothing about MDK. The template's self-contained HTTP JSON
mock is the pattern to follow; adapt it to your device's protocol. (Workers
living inside the MDK monorepo may instead reuse its shared mock framework in
`backend/workers/mock/`.) Then write `plugin/lib/device-client.js`: plain
vendor-protocol I/O returning parsed values, throwing `ERR_*` errors. No
envelopes, no base classes.

### 6. Wire `connect()` and the handlers

`plugin/index.js`:

```js
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,
  connect: async (config, { deviceId }) => {
    const device = createClient(config)
    await device.getSummary() // probe once — unreachable devices are held offline from boot
    return device
  }
  // disconnect: async (device) => device.close()  // if the client holds a socket
}
```

Every handler is `async (ctx, params) => result` where
`ctx = { deviceId, device, config, services }` (frozen; `device` is what
`connect()` returned). Handlers never see envelopes. Telemetry returns the
channel value (matching the contract's declared `type`); commands return a
result object or throw an `ERR_*` error. Full runtime semantics:
`references/worker-base-api.md`.

### 7. Test locally — the four-step loop

Load `references/local-testing.md` for the full procedure. In order:

1. **Contract validation** — step 4 above (no runtime).
2. **In-process smoke** — `node <this-skill>/scripts/worker-smoke.mjs <worker-dir>`
   boots your plugin against your mock (via `smoke.config.js`), asserts every
   declared telemetry channel returns a value of the declared type, and that
   out-of-bounds command params are rejected. No Kernel, no DHT.
3. **Standalone protocol check** — host the plugin on `WorkerRuntime` with a
   tiny caller and drive real envelopes through `handleRequest`.
4. **Site integration** — add the worker to `examples/full-site/start.js` and
   confirm a real Kernel registers it end-to-end.

Also write brittle unit tests (`tests/unit/plugin.test.js` in the template
shows the pattern: boot the mock, `connect()`, call handlers directly).
Run: `npx brittle tests/unit/*.test.js`.

### 8. Boot into a site

A caller process owns the runtime (the plugin package itself never does):

```js
const WorkerRuntime = require('<repo>/backend/core/mdk-worker/lib/worker-runtime')
const { plugin } = require('<your-worker>')
const runtime = new WorkerRuntime(plugin, {
  workerId: 'my-worker-1',                       // required
  devices: [{ deviceId: 'dev-0', config: {...} }],
  kernelTopic                                     // hex topic → DHT announce; omit for local-only
})
await runtime.start()
```

The worker joins the DHT topic; the Kernel pulls identity + capabilities and
starts scheduling telemetry/health. **No Kernel changes are ever needed to add
a worker.**

## Gotchas

- **Unidirectional protocol**: a worker never calls the Kernel — it only
  answers. If you think you need to push, you need a telemetry channel that
  the Kernel will pull.
- **`deviceId` ownership is exclusive** per worker; duplicate ids in
  `opts.devices` throw `ERR_DEVICE_ID_DUPLICATE` at construction.
- `connect()` must **probe** the device (cheap read) so a dead device is held
  offline instead of producing per-request failures later.
- One device offline must never affect siblings — the runtime guarantees this
  as long as `connect()` is where you fail.
- Use `debug` (`require('debug')('mdk:worker:<name>')`), never `console.log`,
  in worker code. Errors are `ERR_SCREAMING_SNAKE` strings.
- The published contract strips `handler` paths; everything else in the
  contract is visible to sites and AI operators — write it accordingly.
