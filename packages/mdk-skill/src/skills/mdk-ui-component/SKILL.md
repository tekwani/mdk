---
name: mdk-ui-component
description: >
  Build a UI component that renders data from a selected MDK worker or plugin.
  Use when the task mentions "UI / component / widget / dashboard", "show
  telemetry", "chart / tile / heatmap", or "render data from a worker/plugin".
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# mdk-ui-component — stub

The full workflow for this job (Site Capability Discovery, response-shape
resolution, devkit component binding) is **not written yet**. Do not invent
component props or field names. Until it ships, ground any UI work in the
real artifacts:

- **Component toolkit:** `ui/packages/react-devkit`
  (`@tetherto/mdk-react-devkit`) — real components live under
  `ui/packages/react-devkit/src/primitives/components/` and
  `ui/packages/react-devkit/src/domain/components/` (TypeScript, `index.tsx`).
- **Data binding:** `ui/packages/react-adapter`
  (`@tetherto/mdk-react-adapter`) provides the hooks that bind components to
  worker/plugin responses; `ui/packages/ui-foundation`
  (`@tetherto/mdk-ui-foundation`) is the styling base.
- **What shapes the component:** the selected worker's
  `plugin/mdk-contract.json` telemetry entries (names, types, units) — see
  `../mdk/references/protocol.md` for how `telemetry.pull` responses are
  structured.
