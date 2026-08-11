---
title: Run a mining site end to end
description: "[⏱️ <3 min] From git clone to a live site with multiple Workers, mock hardware, and a browser dashboard"
docs@tether_slug: tutorials/run-a-site
notes: >-
  Tutorial path over examples/full-site. This page deliberately
  drops its Layout, Options, Plugin, API endpoints, Tests, port table, Notes, and Troubleshooting sections, and carries only a curated
  subset of its Commands list. Add operational detail to the README, not here, and link out rather than restating it.
---

> [!NOTE]
> If Kernel, Gateway, Worker, manager, or thing are unfamiliar, read [terminology][terminology] first.

## Overview

This tutorial runs the [full-site example][full-site-example] end to end: multiple configured Workers across a range of device
families, their mock device servers, a Gateway HTTP API, and a React dashboard, all from one command.

What you'll have at the end:

- The supported fleet: multiple miner types, container types, and power meters; one sensor family with two inlet sensors; and two
  mining pools, each backed by mock hardware that speaks the real wire protocol
- A Gateway API at `:3007` serving `/site/overview`, `/site/history`, and `/site/miners/:id/command`
- A React dashboard at `:3040` with live hashrate, power, and device status
- An MCP server at `:3008` exposing the site's device registry, telemetry, and commands as tools for AI agents

The example boots either in one Node.js process (`node start.js`) or as separate supervised processes through an interactive REPL
(`node cli.js`). This tutorial uses `start.js`, the shortest path, then shows the REPL as an optional step.

## Prerequisites

- Node.js >=24 (LTS)
- npm >=11

<Steps>

<Step>

### Install the example

#### 1.1 Clone the repo

```bash
git clone git@github.com:tetherto/mdk.git
cd mdk
```

#### 1.2 Run setup

```bash
cd examples/full-site
npm run setup
```

`setup` installs `backend/core`, `backend/workers`, the UI workspace devkit packages, and this example's own dependencies. It runs
once; subsequent starts skip it.

> [!NOTE]
> The script walks several workspaces; first run takes 1-2 minutes.

</Step>

<Step>

### Start the site

Start with a small fleet (3 miners per family, 9 total) for a fast first boot:

```bash
node start.js --miners 3
```

Wait for the terminal to print the Gateway and UI URLs:

```text
Gateway  http://localhost:3007
UI       http://localhost:3040
```

Open `http://localhost:3040` in a browser. The dashboard shows live hashrate, total power, and a per-device breakdown.

Verify via the API:

```bash
curl -s http://localhost:3007/site/overview | jq '{miners: (.miners|length), containers: (.containers|length), pools: (.pools|length), sensors: (.sensors|length)}'
```

Expected output:

```text
{
  "miners": 9,
  "containers": 2,
  "pools": 2,
  "sensors": 2
}
```

> [!NOTE]
> The boot log prints a `Site live:` line as soon as the miners and containers report. Pools settle a few seconds later, so that
> line can read `0 pool(s)` while `/site/overview` already returns both.

> [!IMPORTANT]
> `--miners` sets the count per miner family, across three families. The default is 10 per family, so 30 miners in total, and each
> device holds its own socket. Before running a much larger fleet, raise the file-descriptor limit in the same terminal session
> with `ulimit -n 4096`.

</Step>

<Step>

### (Optional) Drive the site from the interactive CLI

`start.js` runs everything in one process. `cli.js` instead supervises each component as its own OS process and gives you a REPL
to drive them, which is the faster way to inspect a running site or restart one component on its own:

```bash
node cli.js
```

At the `mdk>` prompt, bring the site up and query it over HRPC:

```text
up --miners 3
status
keys
ps
```

`status` queries the Kernel directly for Workers, devices, and health. `keys` prints the Kernel and Worker RPC public keys. `ps`
lists the tracked processes with pid, status, uptime, and log path.

Per-component control and log tailing use the same prompt:

```text
start worker whatsminer
logs gateway -f --grep site
seed whatsminer --container container-antspace
stop ui
down
```

`help` prints the full command set. `exit` stops everything and quits.

</Step>

<Step>

### (Optional) Connect an AI agent over MCP

> [!TIP]
> There are a range of agents and service modes by agent, so you will need to apply the correct method
> to connect your agent. For example, to connect Claude CLI:
> `cd examples/full-site`
> `claude`
> Accept `Use this MCP server`
> Then you can access your site data and status via your agent.

The example's [MCP server][mcp-server] connects straight to the Kernel over HRPC and needs no Gateway. It starts with the site on
`:3008` and exposes five tools:

| Tool | Type | Returns |
|---|---|---|
| `get_status` | read | All registered Workers: state, health, device count, RPC key |
| `get_capabilities` | read | Command schema for a device, so an agent knows what `send_command` accepts |
| `pull_telemetry` | read | Latest telemetry metrics from a device |
| `pull_state` | read | Current state snapshot, live readings and config, from a device |
| `send_command` | write | Dispatch a command to a device via the Kernel |

Point an MCP client at `http://localhost:3008/mcp` and it can enumerate the fleet, read telemetry, and issue commands against the
same stack the dashboard is reading.

</Step>

</Steps>

## What just happened

1. **Setup** installed `backend/core`, `backend/workers`, the MDK UI devkit, and this example, which are all the packages `start.js` imports at boot.
2. **Mock hardware**: `mocks.js` started one server per device family (miners on TCP, containers on HTTP and MQTT, power meters
   and sensors on Modbus, pools on REST). They speak the real wire protocols, so every Worker driver runs its true connect,
   collect, and command paths against them.
3. **Kernel**: `getKernel()` started the orchestration layer that discovers Workers as they register and routes telemetry pulls and commands to them.
4. **Workers**: eleven `bootWorker()` calls, one per configured Worker spec, each dispatching to that family's `start{X}Worker()`
   boot function (`startWhatsminerWorker`, `startAvalonWorker`, and so on) to construct a `WorkerRuntime` and connect it to the Kernel.
5. **Gateway**: `startGateway()` mounted the site plugin from `plugins/site/` and opened the HTTP server on `:3007`. The plugin
   aggregates data across the configured Workers through `mdkClient`. The Gateway serves no routes of its own, so those three
   `/site/*` paths exist because this example mounts a plugin that provides them.
6. **UI**: a Vite React dev server started on `:3040`, serving a dashboard built from MDK devkit components.
7. **MCP server**: an MCP server started over HRPC on `:3008`, exposing the site's device registry, telemetry, and command dispatch as tools for AI agents.

## Cleanup

`Ctrl+C` stops mocks, Workers, Kernel, Gateway, and the UI dev server cleanly. From the REPL, `down` or `exit` does the same.

State (Kernel key, Worker seeds, device registry, and tail-log history) persists in `.mdk-data/`. To wipe it:

```bash
rm -rf examples/full-site/.mdk-data
```

## Next steps

- Fix a failed boot, a port clash, or processes left behind after a forced exit with the example's [troubleshooting section][full-site-troubleshooting]
- Build the same shape from an empty directory with one Worker and one route: [build a minimal single-page dashboard][build-a-dashboard]
- Serve your own data by [adding custom plugins to the Gateway HTTP API][plugins]
- Integrate your own hardware by [building a third-party Worker][build-a-worker]
- Run the same supported Worker fleet under PM2 or Docker with the [multi-process deployment guide][all-workers]
- Browse [every runnable example in one place][examples-readme]

## Links

[terminology]: ../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[full-site-example]: ../../examples/full-site/README.md
<!-- docs@tether.io: full-site-example → https://github.com/tetherto/mdk/tree/main/examples/full-site -->

[full-site-troubleshooting]: ../../examples/full-site/README.md#troubleshooting
<!-- docs@tether.io: full-site-troubleshooting → https://github.com/tetherto/mdk/blob/main/examples/full-site/README.md#troubleshooting -->

[all-workers]: ../guides/deployment/run-all-workers-site.md
<!-- docs@tether.io: all-workers → guides/deployment/run-all-workers-site -->

[plugins]: ../guides/gateway/plugins.md
<!-- docs@tether.io: plugins → guides/gateway/plugins -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[build-a-dashboard]: build-a-dashboard.md
<!-- docs@tether.io: build-a-dashboard → tutorials/build-a-dashboard -->

[examples-readme]: ../../examples/backend/README.md
<!-- docs@tether.io: examples-readme → https://github.com/tetherto/mdk/blob/main/examples/backend/README.md -->

[mcp-server]: ../../examples/full-site/docs/mcp-server.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/examples/full-site/docs/mcp-server.md -->
