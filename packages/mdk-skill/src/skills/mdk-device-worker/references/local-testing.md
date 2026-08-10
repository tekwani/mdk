# Local testing — no site required

Load this when verifying a worker. A worker is site-agnostic, so the entire
loop below runs on your machine against the worker's own device mock. Run the
steps in order; each catches a different failure class.

## 1. Contract validation (static, no runtime)

```
node <this-skill>/scripts/validate-contract.mjs <worker>/plugin/mdk-contract.json
```

Schema conformance + handler-file existence + duplicate names + the
numeric-bounds rule. Exit 0/1. Fix and re-run until clean — everything later
assumes a valid contract.

## 2. In-process smoke (plugin + mock, no Kernel, no DHT)

```
node <this-skill>/scripts/worker-smoke.mjs <worker-dir>
```

The harness looks for `<worker-dir>/smoke.config.js` (the template ships one):
`setup()` boots the device mock and returns `{ config, commands?, teardown }`.
The harness then:

1. loads the plugin through the real `loadPlugin` (catching handler wiring
   errors exactly as a boot would),
2. `connect()`s one device and calls **every declared telemetry handler**,
   asserting each returns a defined value of the contract-declared type,
3. replicates the Kernel dispatcher's param validation to assert that every
   bounded numeric param **rejects below-min / above-max** and accepts the
   bounds themselves,
4. executes each command listed in `smoke.config.js` `commands` with its
   sample in-bounds params and asserts success.

Alternative to `smoke.config.js`: pass `--config '<json>'` (or a path to a
`.json`/`.js` config module) if the mock is already running.

## 3. Standalone protocol check (WorkerRuntime, real envelopes, still no Kernel)

Host the plugin on the runtime and drive envelopes through `handleRequest` —
this exercises envelope dispatch, multi-device routing, and offline-holding.
Model: `examples/backend/demo-worker-caller/index.js`. Minimal caller (run the
body inside an `async function main ()` in a `.js` file, or as-is in an
`.mjs`):

```js
'use strict'
const WorkerRuntime = require('<repo>/backend/core/mdk-worker/lib/worker-runtime')
const { plugin } = require('<your-worker>')

const runtime = new WorkerRuntime(plugin, {
  workerId: 'standalone-check',
  devices: [{ deviceId: 'dev-0', config: { host: '127.0.0.1', port: MOCK_PORT } }]
})
await runtime.start() // no kernelTopic → HRPC up, but nothing announced

const res = await runtime.handleRequest({
  id: 'req-1', version: '0.2.0', type: 'request', action: 'telemetry.pull',
  sender: 'standalone-check', target: null, deviceId: 'dev-0',
  timestamp: Date.now(), payload: { query: { type: 'metrics' } }
})
console.log(res.payload.metrics)
await runtime.stop()
```

Check here: `identity.request`, `capability.request` (handler paths must be
stripped), `telemetry.pull` per channel, `command.request` success and
`FAILED` paths, and behavior with the mock stopped (`ERR_DEVICE_UNAVAILABLE`,
siblings unaffected).

## 4. Site integration (a real Kernel)

Your worker package doesn't need to live in the MDK monorepo for this step —
a caller can require it from anywhere; you only need a local Kernel to
register against. In a checkout of the MDK monorepo, drop the worker into the
full-site example: `examples/full-site/start.js`
boots mocks + Kernel + workers + gateway from `WORKER_SPECS` in
`examples/full-site/backend/site.js` — add a spec entry for your worker (the
`demo` entry shows the third-party-plugin shape, no worker-infra plumbing).
Confirm the Kernel registers it, telemetry flows, and commands round-trip.

## Unit tests (accompany every step)

Template pattern (`tests/unit/plugin.test.js`): boot the mock on a free port,
`plugin.connect()`, call handlers directly with a hand-built frozen ctx —
plugin-level tests never need WorkerRuntime. Note the template's test resolves
`loadPlugin` via a monorepo-relative require
(`../../../../../core/mdk-worker/lib/plugin-loader`); if your worker lives
outside `backend/workers/`, resolve handlers from the contract instead — no
runtime import needed (loadPlugin-level wiring is covered by
`worker-smoke.mjs`):

```js
function handler (section, name) {
  const entry = plugin.contract.capabilities[section].find((e) => e.name === name)
  return require(path.resolve(plugin.dir, entry.handler))
}
```

Runner is **brittle** (no mocha, no jest):

```
npx brittle tests/unit/*.test.js
```

Cover at minimum: every telemetry handler against mock values, every command's
effect on mock state, the `connect()` probe rejecting when nothing listens,
and one firmware-error path surfacing its contract `ERR_*` code.
