---
title: Test a new Worker
description: Test a third party Worker package
docs@tether_slug: guides/workers/test-a-worker
---

This guide is for users of third-party worker packages or such partners who have integrated their own hardware, firmware,
or data feed with MDK by shipping a [Worker plugin package][build-a-worker].

## Overview

Worker packages are the contract between the hardware and the Kernel, before relying on such a contract you will want to
test its integration. To seed devices and register with Kernel, host the package on `WorkerRuntimeV2` in a Node.js host process by
pointing it at the Worker plugin package's directory (see [Build a third-party Worker][build-a-worker]). The host module
may live in the Worker plugin package itself; a second npm package is **not required**. A separate host directory is
recommended when independent plugin publication and plugin-only tests are useful:

```text
your-worker-host/
  index.js                      # host module: WorkerRuntimeV2, devices, lifecycle
  run-live.js                   # live Kernel registration and compatibility check
```

`your-worker-host/` is a directory holding one host module, not a standalone npm package.

## Prerequisites

- Node.js `>=24` (all MDK core packages declare this `engines` constraint)
- npm 11 [(< 12)][npm-version]
- A completed [Worker plugin package][build-a-worker], including its bundled mock device
- Comfort with plain async JS — no additional MDK framework knowledge is required beyond what building the package already covered

<Steps>

<Step>

### Check the package

Run the [`mdk` CLI][cli-install] checks against the package directory before you host it. Both exit `1` on any
problem, so the same commands work as a CI gate:

```bash
mdk validate worker --path <worker-package-dir>
mdk validate worker --path <worker-package-dir> --smoke
```

The first command reads `package.json` and `mdk-contract.json` without running anything. It checks the contract
against its schema, that names are unique, that number params have valid `min`/`max` bounds, and that every handler
file exists and compiles.

`--smoke` also calls every handler against the package's bundled mock. `setup()` in `smoke.config.js` at the package
root starts the mock and returns these fields:

| Field              | Purpose                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `config`           | Device opts the handlers see, usually the mock's address and port                                           |
| `env`              | Device env the handlers see                                                                                 |
| `pluginConfig`     | Plugin config the handlers see                                                                              |
| `commands`         | Sample params per command name, each run against the mock. Leave out commands that reboot or disconnect a device. |
| `teardown`         | Stops the mock. Without it, `--smoke` skips the device-stopped checks and prints a warning.                 |
| `offlineTelemetry` | Telemetry channels served from the Worker's own store, such as a `history` log, that keep answering once the device stops |

While the mock runs, every telemetry channel must return its declared type, and every sample command must succeed. The
param gate must reject each bounded number param just outside its range, and each command handler must itself reject
a value below its first bounded param's `min`, since a Worker is reachable without the Kernel's gate in front of it.
After `teardown()`, every telemetry channel and sample command must fail with an `ERR_*` error code before the deadline
(`--timeout`, `10000` ms by default), so a stopped device never reports a stale reading. Two kinds of channel are
exempt:

- A `health` channel may report a status other than `OK` instead of failing
- A channel listed in `offlineTelemetry` must still return its declared type

</Step>

<Step>

### Install MDK

`@tetherto/mdk-worker` (the package that ships `WorkerRuntimeV2`) is **not yet published to the npm registry** — MDK is
pre-1.0 and still distributed as this monorepo. Until it is, the working path from an external repo is a git
dependency plus a deep `require()` into the checked-out repo, exactly mirroring how every in-repo Worker already
resolves it (by relative path, not through `node_modules` package resolution):

```bash
npm install github:tetherto/mdk#main
```

This installs the whole monorepo under `node_modules/@tetherto/mdk` (its root `package.json` name). The monorepo is a
real root npm workspace, but npm does not auto-install a git dependency's own transitive workspace tree — so run a
single install inside the checked-out copy once after adding it:

```bash
(cd node_modules/@tetherto/mdk && npm install)
```

The same deep-path pattern also gets you `getKernel`, `startGateway`, and `waitForDiscovery` from
`require('@tetherto/mdk/backend/core/mdk')`, used to [register with a live Kernel](#register-directly-with-a-live-kernel).

</Step>

<Step>

### Write the host module

`host/index.js`:

```js
"use strict";

const path = require("path");
const { WorkerRuntimeV2 } = require("@tetherto/mdk/backend/core/mdk-worker");

const WORKER_DIR = path.resolve(__dirname, "../your-worker-repo");

async function startVendorWorker({ workerId, kernelTopic, allowedKeys, seedDevices }) {
  const runtime = new WorkerRuntimeV2(WORKER_DIR, {
    workerId,
    kernelTopic: kernelTopic || null,
    allowedKeys,
    devices: (seedDevices || []).map((d) => ({
      deviceId: d.id,
      config: d.opts,
    })),
  });
  await runtime.start();

  return {
    runtime,
    stop: () => runtime.stop(),
  };
}

module.exports = { startVendorWorker };
```

`WorkerRuntimeV2`'s first argument is the Worker plugin package's own directory, the same one that holds its
`mdk-contract.json` (see [Build a third-party Worker][build-a-worker]); there is no plugin module to `require()`.
Required options are `workerId`, a non-empty `devices` array and `allowedKeys`. Each device's `config` object here becomes the
ambient `opts` its handlers read from `@tetherto/mdk-worker/device`. `kernelTopic` is needed only for DHT discovery.

Worker RPC is **fail-closed**: the runtime answers only the public keys in `allowedKeys` (or added later with
`runtime.allowKey(key)`), and `runtime.start()` throws `ERR_WORKER_ALLOWED_KEYS_REQUIRED` when there are none. The
key to allow is the Kernel's **client** key, `kernel.getClientPublicKey()`, the one it dials Workers with. Each of the
next three steps gets that key a different way; see [Trust and admission][trust-and-admission] for the full model.

Without a `store`, `WorkerRuntimeV2` generates a new RPC keypair on restart. Pass a process-owned store if deployment
requires stable identity. The host process also owns persistence, sampling loops, retries, secrets, and shutdown.

`WorkerRuntimeV2` also exposes two read accessors for the host process: `getPublicKey()` returns the runtime's RPC
public key (used to register with Kernel, shown in the next step), and `getDeviceContext(deviceId)` returns a frozen
`{ deviceId, config, services }` for a device that is currently `online`, or `null` otherwise. There is no
`device` key: a directory-loaded plugin has no per-device client object for the host to reach into, since handler
modules bind to their device privately through the ambient context (see Step 4 of Build a third-party Worker). A host
process that needs to act on a live device drives it the same way a Gateway request would, through
`runtime.handleRequest(...)`, rather than through `getDeviceContext(...).device`.

</Step>

<Step>

### Register directly with a live Kernel

When Kernel and the Worker host share a process, register the runtime's public key directly. The following
host script (save it next to your worker as e.g. `host/run-live.js`) proves that Kernel accepted the Worker, that it reached `READY`, and that telemetry traverses the
real client → Kernel → Worker path:

```js
"use strict";

const os = require("os");
const path = require("path");
const {
  getKernel,
  waitForDiscovery,
  shutdown,
} = require("@tetherto/mdk/backend/core/mdk");
const { createMdkClient } = require("@tetherto/mdk/backend/core/client");
const {
  callerKeyPair,
  trustKernel,
} = require("@tetherto/mdk/backend/core/mdk/lib/local-discovery");
const { startVendorWorker } = require("./index");
const vendorMock = require("../your-worker-repo/mock/server");

const ROOT = path.join(os.tmpdir(), `vendor-worker-${process.pid}`);

function onceListening(mock) {
  if (mock.server.listening) return Promise.resolve();
  return new Promise((resolve) => mock.server.once("listening", resolve));
}

function withTimeout(promise, timeoutMs, code) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(code)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function main() {
  let mock;
  let worker;
  let kernel;
  let client;

  try {
    mock = vendorMock.createServer({
      host: "127.0.0.1",
      port: 9001,
      hashrateThs: 200,
    });
    await onceListening(mock);

    kernel = await getKernel({ root: ROOT });
    worker = await startVendorWorker({
      workerId: "vendor-demo",
      allowedKeys: [kernel.getClientPublicKey()],
      seedDevices: [
        { id: "vendor-0", opts: { host: "127.0.0.1", port: 9001 } },
      ],
    });
    // Follow every caller the Kernel admits later (a Gateway, for instance).
    trustKernel(worker.runtime, kernel);

    await kernel.registerWorker(worker.runtime.getPublicKey());
    const workers = await waitForDiscovery(kernel, {
      minWorkers: 1,
      timeoutMs: 30000,
    });
    const ready = workers.find(
      (w) => w.workerId === "vendor-demo" && w.state === "READY",
    );
    if (!ready || !ready.deviceIds.includes("vendor-0")) {
      throw new Error("ERR_WORKER_NOT_READY");
    }

    // The Kernel is fail-closed too: admit this script's own caller key, read-only.
    const caller = callerKeyPair(path.join(ROOT, "caller"));
    kernel.allowKey(caller.publicKey, ["read"]);
    client = createMdkClient({
      kernelKey: kernel.getPublicKey(),
      kernelKeyPair: caller,
    });
    await client.connect();
    const telemetry = await withTimeout(
      client.pullTelemetry("vendor-0", "metrics"),
      8000,
      "ERR_TELEMETRY_TIMEOUT",
    );
    if (typeof telemetry.metrics?.hashrate_rt !== "number") {
      throw new Error("ERR_TELEMETRY_INVALID");
    }

    console.log(`READY ${ready.workerId}: ${ready.deviceIds.join(", ")}`);
    console.log(`hashrate_rt=${telemetry.metrics.hashrate_rt}`);
  } finally {
    if (client) await client.close();
    if (kernel) await shutdown(kernel);
    if (worker) await worker.stop();
    if (mock) mock.exit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

Expected output:

```text
READY vendor-demo: vendor-0
hashrate_rt=200
```

The timeout wrapper bounds the client's wait but cannot cancel the current HRPC request. Always close the client
during shutdown. Device-protocol cancellation is separately owned by the device client from Step 2.

</Step>

<Step>

### Use local-directory discovery on one machine

When the Worker host and Kernel are separate processes on the same machine, neither `registerWorker()` nor a DHT
topic is needed: the Worker publishes its RPC key to a shared directory and Kernel picks it up from there. Both sides
default that directory to `<root>/.worker-keys`, so passing the same `root` is the whole configuration.

```js
"use strict";

const os = require("os");
const path = require("path");
const {
  getKernel,
  waitForDiscovery,
  shutdown,
} = require("@tetherto/mdk/backend/core/mdk");
const {
  keysDir,
  publishWorkerKey,
  trustedKeysDir,
  trustKeysFromDir,
  waitForKernelKey,
} = require("@tetherto/mdk/backend/core/mdk/lib/local-discovery");
const { startVendorWorker } = require("./index");

const ROOT = path.join(os.tmpdir(), `vendor-worker-local-${process.pid}`);

async function main() {
  let worker;
  let trusted;
  let kernel;

  try {
    // Kernel side: publishes its client key to <root>/.trusted-keys.
    kernel = await getKernel({ root: ROOT, discovery: { mode: "local" } });

    // Worker side: allow the Kernel's published key, then every key published
    // there later, and publish the Worker's own RPC key for discovery.
    const trustDir = trustedKeysDir(ROOT);
    worker = await startVendorWorker({
      workerId: "vendor-demo",
      allowedKeys: [await waitForKernelKey(trustDir)],
      seedDevices: [
        { id: "vendor-0", opts: { host: "127.0.0.1", port: 9001 } },
      ],
    });
    trusted = trustKeysFromDir(worker.runtime, trustDir);
    publishWorkerKey(
      keysDir(ROOT),
      "vendor-demo",
      worker.runtime.getPublicKey().toString("hex"),
    );

    const workers = await waitForDiscovery(kernel, {
      minWorkers: 1,
      timeoutMs: 30000,
    });
    const ready = workers.find(
      (w) => w.workerId === "vendor-demo" && w.state === "READY",
    );
    if (!ready) throw new Error("ERR_WORKER_NOT_READY");
    console.log(`READY ${ready.workerId}: ${ready.deviceIds.join(", ")}`);
  } finally {
    if (trusted) trusted.stop();
    if (kernel) await shutdown(kernel);
    if (worker) await worker.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

The two halves are shown in one script here so it runs as a single check, but the mode exists for the split case:
the Kernel process publishes its client key, and the Worker process waits for it (`waitForKernelKey` gives up after
30 seconds with `ERR_KERNEL_CLIENT_KEY_NOT_FOUND`) before it starts and publishes its own key. Kernel rescans the
worker-keys directory every four seconds on top of watching it, so a Worker whose RPC server is not yet listening is
retried on a later scan.

Pass a `storeDir` to `WorkerRuntimeV2` if you restart Workers. The published key is only stable across restarts when
the runtime has a store to persist its seeds in (see [Write the host module](#write-the-host-module)); without one, every restart looks like a new peer to
Kernel and stale `.key` files accumulate.

> [!IMPORTANT]
> Every process must resolve the same filesystem path, so this mode only covers one machine. Workers on separate
> hosts need DHT discovery, in the next step.

</Step>

<Step>

### Use DHT discovery across processes or hosts

For DHT discovery, generate and securely distribute one 32-byte hex topic. Admission is fail-closed in both
directions, and nothing is shared automatically across hosts: give the Worker the Kernel's client key
(`kernel.getClientPublicKey()`, stable across restarts of the same Kernel `root`) in `allowedKeys`, and give the
Kernel the Worker's RPC key, in `discovery.workerKeys` at start or with `kernel.allowWorkerKey()` later. Kernel ignores
a Worker whose key it was not given. Do **not** also call `registerWorker()`:

```js
"use strict";

const crypto = require("crypto");
const os = require("os");
const path = require("path");
const {
  getKernel,
  waitForDiscovery,
  shutdown,
} = require("@tetherto/mdk/backend/core/mdk");
const { startVendorWorker } = require("./index");

const ROOT = path.join(os.tmpdir(), `vendor-worker-dht-${process.pid}`);

async function main() {
  const topic = process.env.MDK_TOPIC || crypto.randomBytes(32).toString("hex");
  let worker;
  let kernel;

  try {
    kernel = await getKernel({ root: ROOT, topic });
    worker = await startVendorWorker({
      workerId: "vendor-demo",
      kernelTopic: topic,
      // On separate hosts, copy this hex key to the Worker host's config.
      allowedKeys: [kernel.getClientPublicKey().toString("hex")],
      seedDevices: [
        { id: "vendor-0", opts: { host: "10.0.0.20", port: 9001 } },
      ],
    });
    kernel.allowWorkerKey(worker.runtime.getPublicKey().toString("hex"));

    const workers = await waitForDiscovery(kernel, {
      minWorkers: 1,
      timeoutMs: 45000,
    });
    const ready = workers.find(
      (w) => w.workerId === "vendor-demo" && w.state === "READY",
    );
    if (!ready) throw new Error("ERR_WORKER_NOT_READY");
    console.log(`READY ${ready.workerId}: ${ready.deviceIds.join(", ")}`);
  } finally {
    if (kernel) await shutdown(kernel);
    if (worker) await worker.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

For separate production processes, each process must install signal handlers and close every handle it owns. DHT
topics enable rendezvous; they are not authentication secrets or command-authorization tokens. See the
[discovery model][discovery-model] for how the three modes compare.

</Step>

</Steps>

## Troubleshooting

### Runtime construction

`new WorkerRuntimeV2(dir, opts)` runs two phases synchronously: it loads and validates the Worker plugin package at
`dir` first (see [Troubleshooting][build-a-worker-troubleshooting] in Build a third-party Worker for
`ERR_WORKER_DIR_REQUIRED` and the contract/handler errors), then validates `opts`:

| Error                             | Diagnostic and remediation                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ERR_WORKER_ID_REQUIRED`          | Pass a non-empty string `workerId`                                                                                |
| `ERR_WORKER_ALLOWED_KEYS_REQUIRED` | Thrown by `runtime.start()`: pass the Kernel's client key in `allowedKeys` (Steps 3–5 show where it comes from). `allowAll: true` admits every peer and is for local experiments only |
| `ERR_DEVICES_REQUIRED`            | Pass a non-empty `devices` array, unless this is an intentional provisioning-first host using `allowEmptyDevices` |
| `ERR_DEVICE_ID_MISSING`           | Every device spec needs a non-empty string `deviceId`                                                             |
| `ERR_DEVICE_ID_DUPLICATE: <id>`   | Device IDs must be unique within one runtime                                                                      |
| `ERR_DEVICE_CONFIG_INVALID: <id>` | `config`, when supplied, must be a non-null object                                                                |

`allowEmptyDevices` opts a host into a provisioning-first bootstrap: the runtime constructs with zero devices instead
of throwing `ERR_DEVICES_REQUIRED`, then takes `registerThing` writes (a built-in command, see
[Worker Runtime store services][worker-runtime-store]) that persist new device configs to the store. Those writes
only take effect once the host is stopped and restarted with the provisioned set — there is no hot-add. It is off by
default; every shipped miner Worker in this monorepo sets it to `true` in its boot function.

### Startup and discovery

| Symptom                                        | Diagnostic and remediation                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `waitForDiscovery()` returns no `READY` Worker | For direct registration, await `runtime.start()` and `kernel.registerWorker(runtime.getPublicKey())`. For DHT, start the Worker first, verify both processes use the same 32-byte hex topic and can reach the DHT network, and that the Worker's RPC key is in Kernel's `discovery.workerKeys` (or admitted with `kernel.allowWorkerKey()`) |
| Worker is present but never `READY`            | Inspect identity and capability failures. Confirm at least one device ID is reported and the contract has valid `metadata` and `capabilities`  |

Every device reports `online` as soon as `runtime.start()` returns; a directory-loaded plugin has no boot-time probe,
so an unreachable device is never a startup symptom (see [Step 5][build-a-worker-verify] of Build a third-party
Worker). If a device is unreachable, look for it at request time instead, in the table below.

### Request time

| Error                              | Diagnostic and remediation                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_DEVICE_NOT_FOUND: <id>`       | The request targeted an ID not seeded in this runtime; compare it with the Kernel registry's `deviceIds`                                                 |
| `ERR_DEVICE_ID_REQUIRED: <type>`   | A named telemetry pull omitted its target device ID                                                                                                       |
| `ERR_DEVICE_ID_REQUIRED`           | A command omitted its target device ID                                                                                                                    |
| `ERR_UNKNOWN_QUERY_TYPE: <type>`   | Use `metrics` or the exact `name` of a telemetry entry; the entry's return `type` is not its channel name                                                |
| `ERR_UNKNOWN_COMMAND: <name>`      | Use the exact declared command name and confirm its handler loaded                                                                                       |
| `ERR_UNKNOWN_ACTION: <action>`     | Use a public MDK client helper instead of constructing protocol actions manually                                                                         |
| Command returns `status: 'FAILED'` | Read the stable `ERR_*` value, check validation/cooldown/device logs, and do not retry a timed-out physical write until its actual device state is known |

An unreachable device does not surface as `ERR_DEVICE_UNAVAILABLE` for a directory-loaded plugin: with no `connect()`
probe and no offline state, the failure comes back from inside the handler's own response instead, isolated to the
telemetry channel that touched the network (`{ error: '...' }` under that channel's key in `metrics`, or
`status: 'FAILED'` for a command); see the [directory-loaded plugin model][build-a-worker-verify] in Build a
third-party Worker.

## Next steps

- Understand the [security boundaries][security-boundaries]

Understand the end-user experience of controlling and monitoring your device via the Worker:

- Build a [minimal dashboard][minimal-dashboard] around one Worker
- Run the [Starter site example][mvp-site] with a supervised, multi-Worker fleet
- Connect [the operator agent][agent-guides] to query and command your Workers over MCP

## Links

[cli-install]: ../cli/install.md
<!-- docs@tether.io: cli-install → guides/cli/install -->

[npm-version]: ../../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[build-a-worker]: build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[build-a-worker-troubleshooting]: build-a-worker.md#troubleshooting
<!-- docs@tether.io: build-a-worker-troubleshooting → guides/workers/build-a-worker -->

[build-a-worker-verify]: build-a-worker.md#verify-the-plugin-loads
<!-- docs@tether.io: build-a-worker-verify → guides/workers/build-a-worker -->


[discovery-model]: ../../../backend/workers/docs/architecture.md#discovery-model
<!-- docs@tether.io: discovery-model → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/architecture.md#discovery-model -->

[security-boundaries]: ../../concepts/security-boundaries.md
<!-- docs@tether.io: security-boundaries → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[trust-and-admission]: ../../../backend/core/mdk/README.md#trust-and-admission
<!-- docs@tether.io: trust-and-admission → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#trust-and-admission -->

[worker-runtime-store]: ../../../backend/core/mdk-worker/README.md#store-services
<!-- docs@tether.io: worker-runtime-store → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#store-services -->

[minimal-dashboard]: ../../tutorials/build-a-dashboard.md
<!-- docs@tether.io: minimal-dashboard → tutorials/build-a-dashboard -->

[mvp-site]: ../../../examples/mvp-site/README.md
<!-- docs@tether.io: mvp-site → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md -->

[agent-guides]: ../agent/index.md
<!-- docs@tether.io: agent-guides → guides/agent -->
