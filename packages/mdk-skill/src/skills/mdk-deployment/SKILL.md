---
name: mdk-deployment
description: >
  Deploy and run a working MDK stack. Use when the task mentions "deploy",
  "run the stack", "single/multi process", "start the Kernel/ORK + workers +
  gateway", or MDK environment configuration.
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# mdk-deployment — stub

The full workflow for this job (runnable launcher examples, start-order
enforcement, env reference) is **not written yet**. Until it ships, ground
any deployment work in the real runnable examples:

- **Whole stack in one boot:** `examples/full-site/start.js` — mock devices +
  Kernel + 11 real workers + gateway + UI, driven from `WORKER_SPECS` in
  `examples/full-site/backend/site.js`. Start here; it encodes the real boot
  order (mocks → Kernel → workers → gateway/UI).
- **Single worker, no Kernel:** `examples/backend/demo-worker-caller/index.js`
  hosts one Worker Plugin on `WorkerRuntime` in-process.
- **Architecture context:** `../mdk/references/architecture.md` (layers,
  request flow, and where each process fits).

Key invariant to respect meanwhile: boot order matters — the Kernel comes up
before workers announce, and the gateway/UI last.
