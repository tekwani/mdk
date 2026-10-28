---
title: See an app serve your data
description: "[⏱️ ~5 min] Scaffold a Worker and an app with the CLI, run the stack, and watch the app answer an HTTP request with live fleet data"
docs@tether_slug: tutorials/see-an-app-serve-data
---

> [!NOTE]
> If Kernel, Gateway, Worker, or app are unfamiliar, read [terminology][terminology] first.

## Overview

The Gateway serves no data routes of its own. It routes HTTP requests to apps, so every endpoint your application reads comes
from an app your stack declares. This tutorial scaffolds one with the `mdk` CLI and runs it so you can watch that happen once
before writing your own.

What you'll have at the end:

- A mock miner Worker with one seed device, scaffolded by `mdk create worker`
- An app with one read-only route, scaffolded by `mdk create app` and running in its own process
- A Gateway on `:3847` forwarding `GET /apps/fleet/api/fleet/summary` to that app
- The JSON body of that request printed to your terminal, counting the Workers and devices the Kernel knows about

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]
- The [`mdk` CLI installed][cli-install]
- [Outbound UDP to the HyperDHT bootstrap nodes][network-requirements]

<Steps>

<Step>

### Create a project

```bash
mkdir fleet-demo && cd fleet-demo
```

Write a minimal `mdk.yaml`:

```yaml
apiVersion: mdk/v1
kind: Stack
metadata:
  name: fleet-demo
spec:
  workers: []
  gateway:
    port: 3847
  apps: []
```

`mdk onboard` writes the same file interactively; this tutorial keeps it to the fields it uses.

</Step>

<Step>

### Scaffold a Worker and an app

```bash
mdk create worker demo-miner
mdk create app fleet
```

Each command copies a template, links the package into the project's `package.json`, runs `npm install`, and adds an entry to
`mdk.yaml`: the Worker under `spec.workers` with a `mock: true` seed device, the app under `spec.apps`.

</Step>

<Step>

### Run the stack

```bash
mdk run
```

`mdk run` boots the Kernel, the Worker and its mock device, one runtime process for the app, then the Gateway. Leave it running
and call the route from a second terminal:

```bash
curl http://localhost:3847/apps/fleet/api/fleet/summary
```

Expected output (ids vary):

```text
{"ok":true,"kernelConnected":true,"workerCount":1,"deviceCount":1,"workers":[{"workerId":"...","devices":1}]}
```

A `workerCount` of `0` means the Worker has not registered yet; call again after a few seconds. That JSON came from a route the
Gateway did not have until the stack declared an app that serves it.

</Step>

<Step>

### Read the files that produced it

The app is a directory with a manifest, a route table and a controller:

```text
apps/fleet/
├── mdk-app.yaml               # id, version, displayName, permissions, config defaults
└── plugin/
    ├── mdk-plugin.json        # the route table the Gateway reads
    ├── lib/client.js          # the app's MDK client
    └── controllers/summary.js # the handler
```

`plugin/mdk-plugin.json` declares the route: an `id`, the `handler` path, an `http` block giving the method and path, and
`"safety": "read-only"`, which is what lets `mdk run mcp` offer the route to an agent as a tool.

`plugin/controllers/summary.js` is the handler. Every controller is `async function (req)` and returns a plain object, which
is sent back as JSON. It never touches a response object:

```js
const mdkClient = require('../lib/client')

module.exports = async function summary (req) {
  const resp = await mdkClient.listWorkers()
  const workers = (resp && resp.workers) || []
  // count devices across every Worker
}
```

`mdkClient`, built once for the app in `plugin/lib/client.js` from `require('@tetherto/mdk-gateway/plugin')`, is the same
protocol client used everywhere else in MDK. **Aggregation lives here, in the app.** Workers are structurally single-device,
so a Worker can only ever answer for one device; combining them into a fleet view is the app's job.

> [!WARNING]
> The route you just called accepted the request without a token, and every route without `"auth": true` behaves the same
> way. Protecting a route is covered in [auth and permissions](../guides/gateway/apps.md#auth-and-permissions).

</Step>

</Steps>

## What just happened

1. **Scaffolding** copied a Worker template (a firmware-v3 miner simulator) and an app template into `workers/demo-miner` and `apps/fleet`, and registered both in `mdk.yaml`.
2. **Kernel** started fail-closed. Each caller, the app runtime included, published its key to `.mdk/trusted-keys/`, which is how the Kernel admits it.
3. **Worker** started with its mock device and published its key to `.mdk/keys/`, where the Kernel discovered it.
4. **App runtime** started `apps/fleet` in its own process, loaded its route table and controller, and accepted calls only from the Gateway's key.
5. **Gateway** read the app's `mdk-plugin.json`, mounted its route under `/apps/fleet`, and forwarded your request to the app runtime over HRPC.
6. **The controller** called `listWorkers()` on the Kernel and returned the counts as JSON.

## Cleanup

Stop `mdk run` with Ctrl+C, then remove the project:

```bash
cd .. && rm -rf fleet-demo
```

## Next steps

- Write your own routes by [building an app][plugins]: the manifests, controllers, reading hardware, and sending commands
- Put a page in front of your route by [building a minimal single-page dashboard][build-a-dashboard]: the same shape with a React front end
- Integrate your own hardware by [building a third-party Worker][build-a-worker]
- See the whole stack instead of one route by [running a mining site end to end][run-a-site]

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[npm-version]: ../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[terminology]: ../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[cli-install]: ../guides/cli/install.md
<!-- docs@tether.io: cli-install → guides/cli/install -->

[plugins]: ../guides/gateway/apps.md
<!-- docs@tether.io: plugins → guides/gateway/apps -->

[build-a-dashboard]: build-a-dashboard.md
<!-- docs@tether.io: build-a-dashboard → tutorials/build-a-dashboard -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[run-a-site]: run-a-site.md
<!-- docs@tether.io: run-a-site → tutorials/run-a-site -->

[network-requirements]: ../reference/environment.md#requirements
<!-- docs@tether.io: network-requirements → reference/environment#requirements -->
