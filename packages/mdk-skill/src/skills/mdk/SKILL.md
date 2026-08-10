---
name: mdk
description: >
  Build on the MDK (Mining Device Kit) platform. Use whenever a task mentions
  MDK, the Kernel/ORK, a worker, a Worker Plugin, mdk-contract.json,
  @tetherto/mdk-* packages, a miner / power meter / sensor / container
  integration, a cross-worker aggregation endpoint, a UI component for
  worker/plugin data, or deploying an MDK stack.
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# Building on MDK

MDK is a P2P mining device management platform layered as:
**Consumers → Gateway → Kernel (a.k.a. ORK) → Workers → Devices**.

The Kernel (`backend/core/kernel`) discovers workers over the Hyperswarm DHT,
pulls telemetry, dispatches commands, and monitors health. Workers
(`backend/workers/`) are device-protocol adapters: a **Worker Plugin**
(`{ contract, dir, connect }` + handler modules) hosted on the generic
`WorkerRuntime` (`backend/core/mdk-worker`). All Kernel ↔ Worker communication
is MDK Protocol envelopes over `@hyperswarm/rpc` — never direct method calls.

Load `references/architecture.md` when you need the module-level picture, and
`references/protocol.md` before touching anything that sends or receives
envelopes. `references/package-index.md` maps every package name to its actual
folder. `references/glossary.md` decodes the terminology.

## Route to the right skill

Skills are installed as flat siblings — each row names a skill directory next
to this one.

| If the task is… | Use skill | Read first |
| --- | --- | --- |
| Integrate a new device (miner, power meter, sensor, container) | `mdk-device-worker` | `references/protocol.md` |
| Add a cross-worker aggregation endpoint | `mdk-app-plugin` *(stub — workflow not written yet)* | — |
| Build a UI component for a worker's/plugin's data | `mdk-ui-component` *(stub — workflow not written yet)* | — |
| Deploy / run an MDK stack | `mdk-deployment` *(stub — workflow not written yet)* | — |

The three stub skills route correctly and point at the real repo artifacts to
learn from until their full workflows ship. For a quick runnable stack use
`examples/full-site/start.js` (Kernel + 11 real workers + gateway + UI, all
against device mocks); for client access patterns see `backend/core/client`
(`@tetherto/mdk-client`).

## Non-negotiable invariants

- **Workers never call the Kernel.** The protocol is unidirectional: the
  Kernel pulls (`telemetry.pull`, `state.pull`, `health.ping`) and pushes
  commands (`command.request`). A worker only ever answers `handleRequest`.
- **`mdk-contract.json` is the single source of truth** for a worker's
  telemetry, commands, health states and error codes. Validate it against
  `references/mdk-contract.schema.json` (the Kernel terminates workers whose
  capability payload is malformed, and rejects commands not declared in it).
- **Never add transport-level envelope fields.** The envelope is exactly
  `{ id, version, type, action, sender, target, deviceId, timestamp, payload }`
  — extend `payload` instead.
- **Use canonical `@tetherto/mdk-*` names only** — the full list lives in
  `references/package-index.md`.
