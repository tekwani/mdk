---
title: The storage model
description: Where MDK data actually lives, what's authoritative versus cached, and what that means as you grow
docs@tether_slug: concepts/the-storage-model
---

## Where data lives

Workers own their own telemetry storage. Kernel's Hyperbee holds three things only: the
Worker/device registry, published capabilities, and the write-command log.

| Data | Lives where | Engine |
| --- | --- | --- |
| Live device state | The device itself | None |
| Worker registry, device capabilities, command log | Kernel's own store | [Hyperbee][hyperbee], via `@tetherto/hp-svc-facs-store` |
| Historical telemetry | Each Worker, in its own store | [Worker-defined][integration-model] |
| Credentials and per-device config | Wherever the Worker plugin author put them |  [Worker-defined][integration-model] |

## What's authoritative, and what's cached

The physical device is the one source of truth, and no Kernel state stands in for it ([Worker health is not device liveness][worker-health]).
Everything above it is a view:

- A **Worker** is the authoritative record of its own device's state
- **Kernel's registry** is authoritative for *routing* (which Worker owns which device), not for device state itself
- **Kernel's command log** is authoritative for write-command lifecycle: every state transition (`QUEUED` →
  `DISPATCHED` → `EXECUTING` → `SUCCESS`/`FAILED`/`TIMEOUT`) is written to a write-ahead log (WAL) before it takes effect,
  so a crash mid-command recovers cleanly on restart. This WAL guarantee is scoped to that one component: the
  registry and capability stores next to it are plain Hyperbee, not WAL-backed.
- Every telemetry read anywhere above Kernel (a Gateway plugin, a dashboard, an agent) is a live pull through the
  chain back to the Worker, never a read from a Kernel-side cache. Kernel caches nothing on your behalf.

## Why this model?

MDK's storage choices favor **local-first, zero-external-dependency operation** over the query flexibility that
alternatives such as a dedicated time-series database or a managed cloud store would give you: a site can run fully
offline, with no database server to provision, back up, or pay for beyond the process itself. The [cost][scalability] is that
cross-device queries (a time range across every miner on a site) are the caller's job, not a stored-procedure or index
the platform gives you for free.

## Retention

Each store grows for a different reason. Expiring a readable result and reclaiming disk space are separate operations:
a deleted key can disappear from the current database view while its backing log retains historical blocks.
The settings column names runtime defaults; the last column identifies what an operator should configure or measure.

| Store | Holds | Grows with | Bounded by | Setting and default | Start with |
| --- | --- | --- | --- | --- | --- |
| Kernel `kernel-registry`, `ork-capabilities` | Worker identities, device to contract mappings | Number of Workers and devices | Rewritten only when a device list changes; `terminate()` deletes the entry | None | Nothing to tune |
| Kernel `kernel-command-wal` | Every command's lifecycle and terminal result | Command volume | TTL pruning removes terminal keys from the current view on recovery and at most hourly while new commands arrive; it does not establish a disk bound | Manager configuration `kernel.commandResultTtlMs`, 24 h; not forwarded by the factories | Measure physical disk growth separately from the number of readable results |
| Worker time logs, legacy surface (`thing-5m-<deviceId>`, `stat-<tf>`, `thing-alerts`, `thing-history-log`) | One snapshot per device per interval, per-timeframe stats, alerts, provisioning history | Devices multiplied by snapshot rate | Rotation requires an explicit length threshold; retention cleanup unlinks older segments | `logRotateMaxLength` unset (rotation off); `logKeepCount`, 3; `storeSnapItvMs`, 5 min | Explicitly configure rotation through the [Worker boot options][worker-retention] and measure retained disk usage |
| Worker storage, `WorkerRuntimeV2` | Whatever the plugin persists | Plugin-defined | Plugin-defined | Plugin-defined | Read the Worker's own README |
| Worker seeds (`storeDir`) | The DHT and RPC seeds that fix the Worker's identity | Constant | Constant | None | Back up with the same care as a private key |
| Gateway store (`<root>/http`) | Identity seeds | Constant | Constant; response caches are in memory | None | Nothing to tune |
| App runtime `storeDir/data/` | Whatever the app persists | App-defined | App-defined | App-defined | Read the app's README |

The legacy rows describe the thing and adapter surface (`createWorkerInfra`), which every in-repo Worker still uses and which 0.12
deprecates; a `WorkerRuntimeV2` Worker, such as the external Antminer Worker and every new Worker, owns its own storage and its own
retention. The [capacity template][capacity-template] is where measured growth per store goes.

## Can you swap the backend?

Not today. Kernel's stores are Hyperbee via `@tetherto/hp-svc-facs-store` with no alternate-backend interface: a
different storage engine is not a supported extension point the way a Worker plugin or Gateway plugin is.

## Getting data out

There is no built-in export or streaming-to-a-warehouse path today. Anything you need outside of a live pull
through a Gateway plugin (a scheduled export, a mirror into another system) is code you write yourself against
`@tetherto/mdk-client`, the same way a plugin controller would.

## Failure

A full disk or an unreachable Worker degrades the specific read that touches it: `telemetryCollector.pull()`
returns nothing for that device rather than blocking every other request. A Kernel restart replays its command WAL
(`recover()` sweeps non-terminal command states) but does not need to reconstruct device state, since it never
owned it.

Each Kernel instance keeps its own separate store: there is no shared or federated storage across multiple
Kernels. A [multi-site deployment][scalability] means multiple independent stores, one per site,
with no cross-site consistency to reason about.

## Next steps

- Understand [the integration model][integration-model]: what a Worker plugin decides to persist, and how
- Understand [architecture][architecture]: the round trip a read or write actually takes
- Understand [scalability][scalability]: what changes about storage as a fleet grows

## Links

[hyperbee]: https://github.com/holepunchto/hyperbee
<!-- docs@tether.io: external link — preserve URL -->

[integration-model]: the-integration-model.md
<!-- docs@tether.io: integration-model → concepts/the-integration-model -->

[architecture]: architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->

[scalability]: scalability.md
<!-- docs@tether.io: scalability → concepts/scalability -->

[worker-health]: control-plane.md#worker-health-is-not-device-liveness
<!-- docs@tether.io: worker-health → concepts/control-plane#worker-health-is-not-device-liveness -->

[capacity-template]: ../guides/deployment/capacity-metrics-template.md#storage-breakdown
<!-- docs@tether.io: capacity-template → guides/deployment/capacity-metrics-template#storage-breakdown -->

[worker-retention]: ../../backend/core/mdk/README.md#start-a-worker
<!-- docs@tether.io: worker-retention → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#start-a-worker -->
