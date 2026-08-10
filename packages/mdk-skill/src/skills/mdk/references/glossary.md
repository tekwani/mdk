# Glossary

| Term | Meaning |
| --- | --- |
| **MDK** | Mining Device Kit — the whole platform: Kernel, workers, gateway, client, UI toolkit. |
| **Kernel** | The orchestration core (`backend/core/kernel`, `@tetherto/mdk-kernel`): discovery, telemetry pulls, command dispatch, health. |
| **ORK** | Orchestration Kernel — the Kernel's former name; older docs and CLAUDE.md use it. Same thing. |
| **Worker** | A device-type adapter process: `WorkerRuntime` hosting a Worker Plugin, speaking MDK envelopes upward and the vendor protocol downward. |
| **Worker Plugin** | What a worker package ships: `plugin/index.js` exporting `{ contract, dir, connect, disconnect? }` plus handler modules under `plugin/src/`. Never subclasses the runtime. |
| **WorkerRuntime** | Generic plugin host (`backend/core/mdk-worker`): loads handlers, owns device contexts, answers envelopes over HRPC, announces on the DHT. |
| **Contract** (`mdk-contract.json`) | A worker's single source of truth: metadata, telemetry channels, commands (with param types/bounds), health states, error codes. Simultaneously machine-validation input and AI context. |
| **Published contract** | The contract as returned on `capability.response` — a copy with internal `handler` paths stripped. |
| **Envelope** | The nine-field MDK Protocol message (`protocol.md`). |
| **Action** | The envelope's verb, e.g. `telemetry.pull`, `command.request` (`backend/core/kernel/lib/protocol/actions.js`). |
| **Channel** | One declared telemetry entry; pulled individually via `query.type = '<name>'` or all together via `type: 'metrics'`. |
| **Handler** | A plugin module `async (ctx, params) => result` mapped from a contract entry; never sees envelopes or transport. |
| **ctx** | The frozen per-device handler context `{ deviceId, device, config, services }`; `device` is whatever `connect()` returned. |
| **connect / disconnect** | Plugin lifecycle: `connect(config, { deviceId })` builds (and probes) a device client; failing devices are held `offline`. |
| **Device** | One physical unit (a miner, a meter…) addressed by `deviceId`; a worker owns its deviceIds exclusively. |
| **kernelTopic** | The Hyperswarm DHT topic a Kernel listens on; workers join it (server mode) to be discovered. |
| **HRPC** | `@hyperswarm/rpc` — the transport; workers expose one `'mdk'` method that takes and returns serialized envelopes. |
| **Worker-infra services** | Optional process-owned services (logs, settings, stats, comments, provisioning…) injected as `opts.services`; served as built-in telemetry types / commands ahead of plugin handlers. |
| **Mock** | A vendor-firmware simulator (per-worker `mock/server.js`, shared framework in `backend/workers/mock/`) so workers run without hardware. |
| **Gateway** | HTTP boundary in front of the Kernel (`backend/core/gateway`); consumers never talk to the Kernel directly. |
| **WAL** | Write-ahead log in the Kernel's command state machine: every state mutation is logged before it takes effect. |
| **Family** | A device category + vendor line (whatsminer, antminer, abb…) under `backend/workers/<category>/<family>/`. |
