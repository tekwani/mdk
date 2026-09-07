---
title: Run a Whatsminer Worker
description: Host the external whatsminer-mdk-worker contract plugin on WorkerRuntimeV2, against a mock or a real device.
docs@tether_slug: guides/miners/run-whatsminer-worker
---

## Overview

Whatsminer support ships as the external
[`whatsminer-mdk-worker`][whatsminer-mdk-worker] contract plugin — a plain `mdk-contract.json` plus handler files, with
no `startWhatsminerWorker` export, no provisioning store, no alerts/stats templates, and no model validation. You host
it yourself on [`WorkerRuntimeV2`][worker-runtime-v2] through a small adapter; this repo ships two working ones to
copy from ([`examples/full-site/backend/whatsminer-adapter.js`][full-site-adapter],
[`examples/mvp-site/backend/whatsminer-adapter.js`][mvp-site-adapter]).

## Prerequisites

Review the [common deployment prerequisites][miner-guide-assumptions] before you start.

Deployment-specific requirements:

- The [`whatsminer-mdk-worker`][whatsminer-mdk-worker] package added as a dependency (it's distributed as a git
  dependency, not on the npm registry — see [its own README][whatsminer-mdk-worker] for the exact version/ref to pin)
- A Node.js service or script in your deployment that constructs the adapter below and registers the resulting Worker
- A supported Whatsminer device reachable from the machine or container running the Worker
- The miner API reachable over encrypted TCP: port `4028` for API v2 (the default) or `4433` for API v3
- The Whatsminer API password — the plugin negotiates a session token from it; there is no separate username

<Steps>

<Step>

### Development

<details>
<summary>Run against a mock</summary>

The plugin ships its own mock at `whatsminer-mdk-worker/mock/api-v3-server`. [`examples/mvp-site`][mvp-site-adapter]
boots one mock per seed device and points the adapter's devices at them — read `startMocks` alongside
`startWhatsminerWorker` in that example's `backend/site.js` for the full wiring (mock lifecycle, port assignment,
device seeding all come from `config/devices.json`).

There is no minimal single-file runnable example for Whatsminer anymore (the old repo-root example shipped against
the retired in-repo package); the full-site and mvp-site example stacks are the reference implementation.
`cd examples/mvp-site && npm run setup:example && npm
start` boots the whole stack — Kernel, mocks, and the Whatsminer Worker included — against seed data in
`config/devices.json`.

</details>

</Step>

<Step>

### Connect a miner

#### 2.1 Write the adapter

`whatsminer-mdk-worker` has no boot helper of its own — construct a [`WorkerRuntimeV2`][worker-runtime-v2] pointed at
the package directory, translating your seed device list into the `{ deviceId, config }` shape it expects:

```js
const path = require('path')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const PKG_DIR = path.dirname(require.resolve('whatsminer-mdk-worker/package.json'))

async function startWhatsminerWorker (opts) {
  const devices = (opts.seedDevices || []).map((seed) => ({
    deviceId: seed.id || seed.info?.serialNum,
    config: { ...seed.opts }
  }))

  const runtime = new WorkerRuntimeV2(PKG_DIR, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    storeDir: opts.storeDir,
    devices
  })

  await runtime.start()
  return { runtime, seeded: devices.length, stop: () => runtime.stop() }
}

module.exports = { startWhatsminerWorker }
```

This is the adapter [`examples/full-site/backend/whatsminer-adapter.js`][full-site-adapter] ships, trimmed of its
input validation and debug logging — copy the real file rather than this excerpt for a production deployment.

#### 2.2 Register your miner

Add this to the Node.js service or script that runs your Worker. The snippet shows the minimum boot call seeding one
Whatsminer device; replace the example IP address and password with your miner's values:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startWhatsminerWorker } = require('./whatsminer-adapter')

const kernel = await getKernel()

const worker = await startWhatsminerWorker({
  workerId: 'whatsminer-rack-1',
  storeDir: './store/whatsminer-rack-1',
  seedDevices: [{
    info: { serialNum: 'WM-001' },
    opts: { address: '192.168.1.10', port: 4028, password: 'admin' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

> [!WARNING]
> Make sure each miner's IP is reachable from the machine or container running the Worker before registering.
> Commands act on physical hardware. Prioritize thermal safety.

> [!IMPORTANT]
> The device list is fixed at construction — there is no `registerThing`/`updateThing`/`forgetThings` equivalent.
> Adding, updating, or removing a device means editing `seedDevices` and restarting the Worker.

The [`whatsminer-mdk-worker`][whatsminer-mdk-worker] README documents the plugin's own `mdk-contract.json`, supported
models, and connection options in full; the shared [install pattern][install-pattern] covers the broader deployment
mechanics.

</Step>

</Steps>

## Troubleshooting

There is no minimal single-file development example to check readiness output against — the reference deployment is
[`examples/mvp-site`][mvp-site-adapter]'s full stack (`npm start` prints `MDK_READY worker devices=<n>` once the
Whatsminer Worker is up).

If the Worker does not come up, or a mock port is already in use, follow [miner troubleshooting][miner-troubleshooting].

## Next steps

- Understand the [deployment topologies][deployment-topologies] for running the Worker service
- Review [`whatsminer-mdk-worker`][whatsminer-mdk-worker]'s own `mdk-contract.json` for telemetry units, command
  shapes, and error codes — it isn't vendored into this repo

## Links

[miner-guide-assumptions]: index.md#prerequisites
<!-- docs@tether.io: miner-guide-assumptions → guides/miners#prerequisites -->

[whatsminer-mdk-worker]: https://github.com/whatsminer/whatsminer-mdk-worker
<!-- docs@tether.io: external link — preserve URL -->

[worker-runtime-v2]: ../../../backend/core/mdk-worker/lib/worker-runtime-v2.js
<!-- docs@tether.io: worker-runtime-v2 → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime-v2.js -->

[full-site-adapter]: ../../../examples/full-site/backend/whatsminer-adapter.js
<!-- docs@tether.io: full-site-adapter → https://github.com/tetherto/mdk/blob/main/examples/full-site/backend/whatsminer-adapter.js -->

[mvp-site-adapter]: ../../../examples/mvp-site/backend/whatsminer-adapter.js
<!-- docs@tether.io: mvp-site-adapter → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/whatsminer-adapter.js -->

[install-pattern]: ../../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[deployment-topologies]: ../deployment/index.md
<!-- docs@tether.io: deployment-topologies → guides/deployment -->

[miner-troubleshooting]: troubleshooting.md
<!-- docs@tether.io: miner-troubleshooting → guides/miners/troubleshooting -->
