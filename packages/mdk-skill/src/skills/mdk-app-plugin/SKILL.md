---
name: mdk-app-plugin
description: >
  Build a cross-worker aggregation plugin for the MDK App Node. Use when the
  task mentions "aggregate", "combine workers", "site summary / rollup",
  "plugin", "mdk-plugin.json", or a "cross-worker endpoint".
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# mdk-app-plugin — stub

The full workflow for this job (Site Capability Discovery, `mdk-plugin.json`
authoring, controller implementation) is **not written yet**. Do not invent
it. Until it ships, ground any plugin work in the real artifacts:

- **Real plugins to imitate:** `backend/core/plugins/` — `auth/`,
  `telemetry/`, and `site-hashrate/` are the shipped examples (plain folders,
  no per-plugin `package.json`); `backend/core/plugins/README.md` describes
  the loader surface.
- **Client access:** `backend/core/client` (`@tetherto/mdk-client`) is how
  controllers query workers. Its calls return the bare payload — do not read
  `.payload` on results.
- **What workers expose to aggregate over:** each worker's
  `plugin/mdk-contract.json` (see the `mdk-device-worker` skill's references
  for the contract format and `../mdk/references/protocol.md` for the
  envelope/action set).

Key invariant to respect meanwhile: never reference a worker, channel, or
field that is not actually installed in the target site — aggregation code
must be grounded in the real contracts, not assumed fleet shapes.
