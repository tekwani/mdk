# MDK MVP site example

A minimal, single-container mining site demo: Kernel, Gateway, Whatsminer,
Antminer, and SealMiner workers, Ocean, EMCD, SpiderPool, and Foundry pool workers, SATEC powermeter worker, and the MDK React UI.

## What you get

- **Kernel + Gateway** — the orchestration layer and its HTTP API, on `:3000`. The site app
  ([`backend/gateway-plugins/site`](./backend/gateway-plugins/site/mdk-app.yaml)) runs in its own `app-site` process under
  `@tetherto/mdk-app-runtime`, and the Gateway forwards each request to it, mounted at `/` because the UI calls `/site/*`
- **Whatsminer worker** — mock miners, seeded from `config/devices.json`, hosted from the external
  [`whatsminer-mdk-worker`](https://github.com/whatsminer/whatsminer-mdk-worker) plugin
  ([`backend/whatsminer-adapter.js`](./backend/whatsminer-adapter.js))
- **Antminer worker** — mock miners, seeded from `config/devices.json`, hosted from the external
  [`antminer-mdk-worker`](https://github.com/bitmain-official/antminer-mdk-worker) plugin
  ([`backend/antminer-adapter.js`](./backend/antminer-adapter.js))
- **SealMiner worker**: mock miners, seeded from `config/devices.json`, hosted from the external
  [`sealminer-mdk-worker`](https://github.com/sealminer/sealminer-mdk-worker) plugin
  ([`backend/sealminer-adapter.js`](./backend/sealminer-adapter.js))
- **Ocean pool worker** — mock pool stats on a fast demo-paced tick
- **EMCD, SpiderPool, and Foundry pool workers** — mock pool stats from the external
  [`emcd-mdk-worker`](https://github.com/emcdio/emcd-mdk-worker),
  [`spiderpool-mdk-worker`](https://github.com/SpiderPool-New/spiderpool-mdk-worker), and
  [`foundry-mdk-worker`](https://github.com/foundryservices/foundry-mdk-worker) plugins, each against its package's
  bundled API mock ([`backend/pool-adapter.js`](./backend/pool-adapter.js))
- **SATEC powermeter worker** — mock power readings, scaled to the seeded miner count
- **MDK React UI** — Dashboard, Containers, Miners, Monitoring, Pools, and Control pages, served
  from the Gateway
- **One MCP surface, two tool sources** — a standalone MCP process (`--role mcp`) serves both a hand-authored tool set
  ([`backend/mcp-plugins/site`](./backend/mcp-plugins/site/)), with agent-contract metadata and curated granularity, and the
  site app's own HTTP routes, read off the same route table the Gateway forwards and converted into tools whose calls go
  to the site app's runtime, as the Gateway's requests do. The Gateway itself hosts no MCP server. Listed in [`.mcp.json.example`](./.mcp.json.example).
- **Independent processes** — every component above runs as its own PM2-supervised OS process

## Prerequisites

- Node.js >= 24
```bash
npm install -g pm2   # run once
```

## Setup

```bash
cd examples/mvp-site
npm run setup   
npm run setup:config
# installs backend/core, backend/workers, this example + its UI
```

## Start the site

```bash
npm start
```

[`start.js`](./start.js) generates a local `deploy/ecosystem.config.js` (not committed) from
[`config/site.deploy.json`](./config/site.deploy.json.example), starts the PM2 apps, then exits — PM2 itself keeps
the processes running in the background.

```bash
pm2 list      # mocks, mocks-antminer, mocks-sealminer, mocks-ocean, mocks-satec, mocks-emcd, mocks-spiderpool, mocks-foundry, kernel, worker, worker-antminer, worker-sealminer, worker-ocean, worker-satec, worker-emcd, worker-spiderpool, worker-foundry, app-site, gateway, mcp
pm2 logs
```

Once `pm2 list` shows all apps `online`, open `http://localhost:3000/`.

Each `gateway.pluginDirs` entry in `config/site.deploy.json` runs as an app in its own PM2 role, `app-<basename>` (so
`backend/gateway-plugins/site` is `app-site`). `start.js` derives these roles from `gateway.pluginDirs` and adds any that
`pm2.roles` lacks ahead of `gateway`, so a deploy config written before apps existed needs no change. An `app-*` role with no
matching plugin dir is skipped with a warning.

### Open the UI from another machine

The gateway binds `0.0.0.0` but serves only the Host names it knows, and the agent
chat routes (`auth: true`) admit callers on this machine only (`"authVerifier": "loopback"`).
To use the UI over the LAN, list the address you open it with in `config/site.deploy.json`:

```json
"gateway": { "allowedHosts": ["10.0.0.4:3000"] }
```

Remote operators can then load the dashboards. The agent chat still answers `401` to them until the
gateway is given a real verifier (see the
[gateway security model](../../backend/core/gateway/README.md#security-model)).

## Stop the site

```bash
npm run stop:pm2
```

## UI pages

Dashboard, Containers (list + per-container detail), Miners (every miner across
all miner workers, with search and brand/status/container filters), Monitoring
(powermeter + sensor charts), Pools, and Control — all served from `ui/dist` via the Gateway
at port `3000`. The Pools page shows the Ocean, EMCD, SpiderPool, and Foundry pool stats; the Monitoring page
charts the SATEC meter's power series.

## UI dev mode (hot reload)

```bash
npm run dev:ui
```

Starts the Vite dev server (default `http://localhost:3040`, override with
`MDK_UI_PORT`) proxying `/site/*` to the Gateway. Requires `npm start` to be
running separately so there's a Gateway to proxy to.

Rebuild the static bundle the Gateway serves with:

```bash
npm run build:ui
```

## Configure devices

### Seed devices

`config/devices.json` is gitignored (local/per-dev config). It is an object
keyed by device type — `miners` feed the Whatsminer worker, `antminers` the
Antminer worker, `sealminers` the SealMiner worker, `powermeters` the SATEC worker. Copy [`config/devices.json.example`](./config/devices.json.example) and adjust:

```json
{
  "miners": [
    {"info": { "serialNum": "WM-001", "container": "rack-1" }, "opts": { "address": "127.0.0.1", "port": null, "password": "admin" }},
    {"info": { "serialNum": "WM-002", "container": "rack-1" }, "opts": { "address": "127.0.0.1", "port": null, "password": "admin" }}
  ],
  "antminers": [
    {"info": { "serialNum": "AM-001", "container": "rack-1" }, "opts": { "address": "127.0.0.1", "port": null, "username": "root", "password": "admin" }}
  ],
  "sealminers": [
    {"info": { "serialNum": "SM-001", "container": "rack-1" }, "opts": { "address": "127.0.0.1", "port": null }}
  ],
  "powermeters": [
    {"info": { "serialNum": "SATEC-001", "pos": "site" }, "opts": { "address": "127.0.0.1", "port": null, "unitId": 1 }}
  ]
}
```

Leave `opts.port` as `null` — each device is assigned its own mock port
automatically (miners from `mocks.portBase`, `14031` by default; antminers
from `antminer.mocks.portBase`, `16080` by default; sealminers from
`sealminer.mocks.portBase`, `17028` by default; powermeters from
`satec.mocks.portBase`, `15020` by default, in `config/site.deploy.json`).

To register **real devices**, set each entry's `opts.address`/`opts.port` to
the device's LAN address — Whatsminer API port (usually `4028`) for miners,
HTTP CGI port (usually `80`) plus web `username`/`password` for antminers,
bdminer API port (usually `4028`, no credentials) for sealminers,
Modbus TCP address/port/`unitId` for SATEC PM180 meters. Keep `info.pos`
`"site"` on powermeters you want aggregated into the site power figures.

### Antminer config

`config/site.deploy.json` under `antminer`:

- `antminer.worker.id` — the worker's stable ID (`antminer-s21-telemetry-flow`).
- `antminer.worker.type` — device type tag applied to every `antminers` entry
  (`miner-am-s21` by default); resolves the rated J/TH the plugin reports in `snap`.
- `antminer.mocks.portBase` / `defaultPassword` — CGI mock ports and the digest
  password used when an entry omits `opts.password`. Going live, remove the
  `mocks-antminer` role from `pm2.roles`.

`worker.pools` is the default pool list for both miner workers. A local
`config/site.deploy.json` created before this section existed keeps working; add
the `antminer` block and the `mocks-antminer`/`worker-antminer` roles from
[`config/site.deploy.json.example`](./config/site.deploy.json.example) to enable it.

### SealMiner config

`config/site.deploy.json` under `sealminer`:

- `sealminer.worker.id`: the worker's stable ID (`sealminer-a2-telemetry-flow`).
- `sealminer.worker.series`: `A2`, `A3` or `A4`, applied to every `sealminers`
  entry that doesn't set its own `opts.series`. Declaring it beats letting the
  plugin infer the series from the model string.
- `sealminer.mocks.portBase` / `firmware`: 4028 API mock ports and the firmware
  build the mocks report (it gates which write commands they accept). Going live,
  remove the `mocks-sealminer` role from `pm2.roles`.

Pools are set on a SealMiner through its `setupPools` command, so `worker.pools`
doesn't apply to it. A local `config/site.deploy.json` created before this section
existed keeps working; add the `sealminer` block and the
`mocks-sealminer`/`worker-sealminer` roles from
[`config/site.deploy.json.example`](./config/site.deploy.json.example) to enable it.

### Pool config (Ocean)

The Ocean pool is not a LAN device — its config lives in
`config/site.deploy.json` under `ocean`:

- `ocean.pool.apiUrl` — the pool REST API. Defaults to the local mock
  (`http://127.0.0.1:8010`). To go live, point it at the real Ocean API and
  remove the `mocks-ocean` role from `pm2.roles`.
- `ocean.pool.accounts` — the pool account usernames to track. Replace
  `sample-ocean-account` with your accounts to go live.
- `ocean.worker.tickMs` — demo pacer interval; stats refresh this often.

### Pool config (EMCD, SpiderPool, and Foundry)

These pools work like Ocean: one logical device per worker, configured under `emcd`, `spiderpool`, and `foundry` in
`config/site.deploy.json`, each with a `pool`, `worker`, and `mock` section.

- `emcd.pool.apiUrl` defaults to the local mock (`http://127.0.0.1:5065/pool/v1`); `emcd.pool.accounts` lists EMCD
  subaccount IDs, and an empty list means the master account.
- `spiderpool.pool.apiUrl` defaults to the local mock (`http://127.0.0.1:5066`); `spiderpool.pool.accounts` lists
  SpiderPool subaccount names. The mock serves `spider-test`.
- `foundry.pool.apiUrl` defaults to the local mock (`http://127.0.0.1:5067`); `foundry.pool.accounts` lists Foundry
  sub-account names and can't be empty. The mock serves `test`. A name entry uses `FOUNDRY_API_KEY`; to give a
  sub-account its own key, write the entry as `{ "name": "...", "apiKey": "..." }` in a local config only.
- `<pool>.worker.tickMs`: demo pacer interval, as for Ocean. SpiderPool spaces its API requests one second apart, so
  its first stats arrive a few seconds after the worker starts. Foundry spaces requests 250 ms apart.

Credentials never go in `site.deploy.json`. Each worker reads them from the environment, and falls back to its
package's public mock fixtures (with a warning in its log) when they are unset:

| Pool | Environment variables |
| --- | --- |
| EMCD | `EMCD_API_KEY`, `EMCD_API_SECRET` |
| SpiderPool | `SPIDERPOOL_ACCESS_KEY`, `SPIDERPOOL_PRIVATE_KEY` |
| Foundry | `FOUNDRY_API_KEY` (a sub-account API key, or an `fdpat_` personal access token covering every sub-account) |

To go live, set the variables in the environment PM2 starts from, point `apiUrl` at the real API (or remove it for
the package default), set `accounts`, and remove the matching `mocks-emcd`, `mocks-spiderpool`, or `mocks-foundry` role from
`pm2.roles`. To drop a pool, remove both its roles.

These packages declare the MDK monorepo as an `@tetherto/mdk` peer dependency, which isn't on the npm registry.
[`lib/mdk-compat`](./lib/mdk-compat/README.md) stands in for it inside this workspace.

### SATEC config

`config/site.deploy.json` under `satec`:

- `satec.worker.thing` — snap collection/persist cadence (demo-fast, 5s).
- `satec.mocks.portBase` — Modbus mock ports. By default the reported power
  scales with the number of miners (Whatsminer plus Antminer) seeded in `config/devices.json` (split
  evenly across however many `powermeters` entries you configure); set
  `satec.mocks.powerW` to override with a fixed figure instead. Going live,
  remove the `mocks-satec` role from `pm2.roles` and point the `powermeters`
  entries in `config/devices.json` at the real meters.

## Reset state

Every process keeps its runtime state under one directory, `root` in `config/site.deploy.json` (`.site-data` by default):

```text
.site-data
├── .kernel-key        # Kernel public key the Gateway, apps, and MCP dial
├── .trusted-keys/     # caller keys the Kernel and Workers admit
├── .worker-keys/      # Worker RPC keys for local discovery
├── kernel-db/         # Kernel store
├── workers/<id>/      # one store per Worker
├── apps/<name>/       # app runtime identity and data
├── gateway/           # Gateway config, identity, and store
├── gateway.key        # Gateway key the app runtimes admit
└── mcp/               # MCP caller identity
```

Seed devices are only registered **once**, when a worker's store is
empty. If you change [`config/devices.json`](./config/devices.json.example) (miners or powermeters) after the
first run, clear state before restarting:

```bash
npm run stop:pm2
rm -rf .site-data
```

## Troubleshooting

### Kernel fails to start: `Invalid device file, was moved unsafely`

**Symptom**: PM2 shows `kernel` status as `errored` with:

```text
Error: Invalid device file, was moved unsafely
```

**Cause**: The `.site-data` directory contains RocksDB files with embedded path metadata from a previous location. This happens when the repo is
moved, copied, cloned to a new location, or when switching between multiple clones of the same repo.

**Fix**: Remove the persisted state directory:

```bash
npm run stop:pm2
rm -rf .site-data
```

The Kernel recreates `.site-data` with correct path metadata on next boot. All devices and history are re-seeded.

### Port conflicts

**Symptom**: A component fails to start with `EADDRINUSE`.

**Check**: Verify no other process is holding the required ports:

```bash
lsof -nP -iTCP:3000   # Gateway
lsof -nP -iTCP:8010   # Ocean mock
lsof -nP -iTCP:5065   # EMCD mock
lsof -nP -iTCP:5066   # SpiderPool mock
lsof -nP -iTCP:5067   # Foundry mock
lsof -nP -iTCP:15020  # SATEC mock
lsof -nP -iTCP:16080  # first Antminer mock
lsof -nP -iTCP:17028  # first SealMiner mock
```

Whatsminer mock ports start at `14031`, Antminer mock ports at `16080`, SealMiner mock ports at `17028`. If another example or a previous run left processes
running, stop them first or edit [`config/site.deploy.json`](./config/site.deploy.json.example) to use different ports.

**Fix**: Stop stale PM2 processes:

```bash
npm run stop:pm2
```

### Stale PM2 processes after system crash

**Symptom**: `npm start` fails because components are already running, or ports are held.

**Check**: List PM2-managed processes:

```bash
pm2 list
```

**Fix**: Stop all PM2 apps:

```bash
npm run stop:pm2
```

If PM2 itself is unresponsive, kill all PM2 processes:

```bash
pm2 kill
```
