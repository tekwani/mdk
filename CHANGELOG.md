# Changelog: mdk-0.9.0

> For a high-level introduction, see the [release notes](./docs/reference/release-notes/0.9.0-release.md)

## v0.9.0

- Collapses the repository into **one root npm workspace** (UI aside): every publishable backend package, the standalone
  `packages/*` tools and three of the examples install and link from a single root `npm install`, retiring the per-domain
  roots and the hand-rolled `install-packages.sh` / `clean-workspaces.sh` scripts that kept them in step
- Gives every Gateway plugin an **ambient logger and an `onReady` hook** on its frozen context, so a plugin's output is
  tagged, levelled and ordered in the same stream as the requests it serves instead of arriving as bare `console` lines
- Adds a **measurement layer for the agent**: a hash-chained run ledger, a reproducibility manifest and a scoring rollup
  with a regression gate, so a battery score is attributable to a specific tree, model and charter rather than to a run
- Ships **`mdk-site-sizing`** in the skill suite: turns a plain description of a site into a Kernel/Worker/Gateway layout
  using the benchmark harness's measured envelopes
- Scaffolds now link bundled packages by **relative `file:` spec** rather than a workspace glob, so a generated project
  installs standalone; a scaffolded plugin is booted against a real Gateway in CI on every change

## Breaking changes

### The repository is a single npm workspace

`backend/core/`, `backend/workers/` and `packages/` are no longer install roots of their own. Their `package.json`,
`package-lock.json` and the shell scripts that drove them are gone, and the root workspace list is glob-based:

| Removed | Replacement |
| --- | --- |
| `backend/core/package.json`, `backend/workers/package.json`, `packages/package.json` | root `workspaces`: `backend/core/*`, `backend/plugins/*`, `backend/tests/*`, `backend/workers/**`, `packages/cli`, `packages/mdk-skill` |
| `backend/core/install-packages.sh`, `backend/workers/install-packages.sh` | a single root `npm install` |
| `backend/core/clean-workspaces.sh`, `backend/workers/clean-workspaces.sh`, `backend/workers/test-packages.sh` | root `npm run clean` / `npm test --workspaces` |
| `npm run setup:core`, `npm run setup:workers` | `npm run setup` is now `npm run setup:ui && npm install` |
| the per-package `package-lock.json` under `backend/**` and `examples/full-site` | the root `package-lock.json` |

The UI toolkit (`ui/`) stays a separate Turborepo workspace with its own lockfile; root scripts forward to it by prefix.
A checkout that still has the old nested `node_modules` directories should remove them before the first root install.
npm resolves against a stale nested tree in preference to the hoisted one.

### `@tetherto/mdk-agent` moves to the current AI SDK

The agent's model stack crosses several majors at once. A host that pins these itself has to move with it:

| Dependency | Was | Now |
| --- | --- | --- |
| `ai` | `^6.0.0` | `^7.0.0` |
| `zod` | `^3.23.0` | `^4.0.0` |
| `@ai-sdk/openai-compatible` | `^2.0.0` | `^3.0.0` |
| `@qvac/ai-sdk-provider` | `^0.3.0` | `^0.6.1` |
| `@qvac/cli` (optional peer) | `^0.9.0` | `^0.12.0` |

### `npm ci` still requires the agent to install the agent Gateway plugin

`@tetherto/mdk-plugin-agent` declares `@tetherto/mdk-agent` as a plain `dependencies` entry, not an optional peer, so an
install that omits the agent still fails to resolve. This is a known limitation carried into 0.9.0, not a new regression;
tracked as open.

### The Gateway no longer auto-registers default plugins

Earlier versions mounted `telemetry`, `site-hashrate`, and `site-monitor` automatically. A Gateway now loads only the plugins a stack names in `spec.gateway.plugins[]`, so a stack that
never declared those three loses their routes on upgrade. Declare each one you rely on as an `@tetherto/mdk-plugins/<name>` subpath.

## Added

### Gateway plugins get a logger and an `onReady` hook

`buildPluginContext` freezes two more members onto the context a plugin imports from
`require('@tetherto/mdk-gateway/plugin')`, alongside the existing `config`:

- **`logger`**: a `pino` instance tagged with the plugin's name (from `mdk-plugin.json`, falling back to the directory).
  It carries the full level set plus `child()`, so a plugin can sub-tag its own subsystems. Everything the Gateway prints
  (Fastify's request lines and every plugin's output) goes through one destination.
  ([`workers/lib/logger.js`](backend/core/gateway/workers/lib/logger.js)), which is `pino-pretty` on a TTY and NDJSON when
  stdout is piped, the shape log shippers expect. `debug: 0` in the Gateway's `common.json` remains the default, so debug
  lines stay opt-in.
- **`onReady(cb)`**: registers a callback to run once the Gateway has finished booting. Plugin modules load from the
  worker's `init()`, which is too early for work that needs a live server. A callback that throws is warned through the
  Gateway logger rather than taking the boot down.

### An evaluation layer for the agent

`@tetherto/mdk-agent` gains three modules and a CLI, so an eval run leaves a record that can be checked later:

| Module | Responsibility |

| --- | --- |
| [`src/ledger.js`](backend/core/agent/src/ledger.js) | Append-only run chain: `canonical`, `entryHash`, `appendRun`, `readChain`, `verifyChain`. Each entry hashes its predecessor, so a rewritten history fails verification |
| [`src/manifest.js`](backend/core/agent/src/manifest.js) | Reproducibility record: `buildManifest`, `sha256`, `hashFile`, `gitCommit`. Pins the tree, model and charter a score belongs to |
| [`src/analyse.js`](backend/core/agent/src/analyse.js) | Scoring: `levelOf`, `byCase`, `rollup`, and `gate`, which compares a run against a baseline within a tolerance |
| [`eval/analyse.mjs`](backend/core/agent/eval/analyse.mjs) | CLI over `ledger.js`, `manifest.js` and `analyse.js`, with difficulty tiers in `eval/difficulty.json` |

The methodology (what a run scores, the three questions one run can answer, and how expectations resolve against the
fleet under test rather than being baked into the battery) is written up in
[`docs/EVALUATION.md`](backend/core/agent/docs/EVALUATION.md).

### `mdk-site-sizing` joins the skill suite

A new skill in `@tetherto/mdk-skill` turns a plain description of a site (device counts, families, constraints) into a
Kernel/Worker/Gateway layout, reading the benchmark harness's measured envelopes rather than guessing, and ships its own
`references/`, `scripts/` and eval set.

### A site security blueprint

[`docs/guides/security/index.md`](docs/guides/security/index.md) documents how to secure an enterprise MDK site assembled
from UI, Gateway, Kernel and Workers. It opens by stating plainly what MDK does *not* provide (no user identity at any
tier, every plugin route served to any caller) and covers the steps and options for closing that at deployment time.

### Elsewhere

- **`Loader` gains an `inline` prop**: renders an inline activity indicator instead of a block loading state, for use
  inside a flow of content
- **Scaffolded plugins get a plugin-owned MDK client**: [`templates/plugin/lib/client.js`](packages/cli/templates/plugin/lib/client.js)
  builds it from the ambient Gateway context, so controllers import the module and never take `mdkClient` from a services bag
- **A scaffold smoke test in CI**: [`scaffold-checks.yml`](.github/workflows/scaffold-checks.yml) scaffolds a plugin with
  the CLI, boots it behind a real Gateway and asserts a 200, backed by [`examples/backend/mdk-scaffold-e2e`](examples/backend/mdk-scaffold-e2e/run.js)
- **`setup-config.sh` for the benchmark harness**, seeding a runnable config from the checked-in example

## Changed

- **Bundled packages are linked by relative `file:` spec, not a workspace glob.** `addFileDependency` writes
  `file:./workers/<name>` relative to the generated project, so a scaffolded project installs on its own instead of
  depending on being inside this repo's workspace. On Windows, where `path.relative()` returns an absolute path across
  drive boundaries, it falls back to the absolute path rather than emitting a `file:./C:/…` spec that npm resolves under
  the project directory and 404s.
- **`fast-uri` is overridden by range selector rather than a blanket pin**: `fast-uri@>=3.0.0 <3.1.5` → `3.1.5` and
  `fast-uri@>=4.0.0 <4.1.4` → `4.1.4`, so a legitimate future major is not forced to downgrade

## Removed

- **`@tetherto/mdk-ui-cli` (`mdk-ui`)**: the UI-side CLI is gone in its entirety (it was a workspace-private package, so
  nothing published depended on it)
- **The shell template's System Info page**: `src/pages/SystemInfo.tsx` and `src/components/SystemInfoPanel.tsx`, with the
  route and navigation entries that pointed at them

## Security

- **`undici` is pinned to `>= 6.24.0`** at the root, closing the advisory across every workspace member in one place now
  that the tree has a single install root

## Fixed

- **A working agent turn could look frozen**: turn with no streamed text yet rendered nothing, so a slow first token was
  indistinguishable from a stall; the assistant message now shows an inline activity indicator until content arrives
- **`bundledPluginDir` checked the manifest before containment**: a name that escaped the bundled-plugin directory reached
  the manifest check first and failed with the wrong error; containment is now verified first
- **`ERR_MDK_CLIENT_UNAVAILABLE` was detected by a fragile check**, and `resolveProjectPackageDir` carried an unused `kind`
  parameter, both tightened
- **The benchmark harness's config defaults and memory-leak gate** were corrected so a default run reports against the
  thresholds it documents

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
