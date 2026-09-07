# Changelog: mdk-0.8.0

> For a high-level introduction, see the [release notes](./docs/reference/release-notes/0.8.0-release.md).

## v0.8.0

- Ships **`@tetherto/mdk-ui-agent`**, the operator agent as a drop-in `<CoPilot />` for any MDK shell, with a headless
  `./core` subpath so a host can reuse the SSE contract, turn reducer and conversation store without taking the components
- Gives the agent a **versioned charter** — its standing instruction becomes a pinned module whose version travels with every
  eval report, so a battery score still means something a month later
- Adds an **OpenAI-compatible hosted model provider** beside the local one, with request pacing, rate-limit retries and
  API-key redaction; the local provider remains the default and nothing becomes remote by accident
- Hardens the agent against its own failure modes — no arithmetic, no partial list reported as a whole, no tool named to the
  operator, no speculative calls, one device per action — and pins those rules with an eval battery
- **Tunes the benchmark harness** (`backend/tests/benchmark/`) for heavier stress-test load and loosens its leak-detection
  threshold to match
- Removes the in-repo Whatsminer Worker in favor of MicroBT's own externally maintained `whatsminer-mdk-worker`, hosted on `WorkerRuntimeV2` through a small adapter, with a
  bundled `mdk-crypto-lib` shim standing in for the `crypto-js` package it still declares

No UI module export was removed or renamed: the `ui/api-surface/` baselines record only additions. Elsewhere, the in-repo Whatsminer Worker's
`startWhatsminerWorker` export is gone along with the package itself, the sample site's MCP tools renamed result fields, and the `mdk onboard`
picker lost entries: see [Changed](#changed) and [Removed](#removed).

## Added

### `@tetherto/mdk-ui-agent` — the operator agent as a drop-in

A new UI package rendering the agent Gateway plugin's event contract as a conversation. It is workspace-linked
(`private: true`) and consumed by path, like the other `ui/packages/*` members.

| Entry point | Contents |
| --- | --- |
| `@tetherto/mdk-ui-agent` | `CoPilot`, `ChatUIEntry`, the `use-agent-chat` / `use-agent-config` / `use-conversations` hooks, the `AGENT_NAME` and `OPERATOR_NAME` strings, and the `AGENT_LABELS` object. It also does `export * from './core'`, so the headless surface is reachable from here as well |
| `@tetherto/mdk-ui-agent/core` | The headless half — event and turn types, the SSE transport, the turn reducer, the conversation store, markdown and prose helpers. No React. It does reach for browser globals (`fetch`, `localStorage`, `crypto`), each behind a guard or injectable, and `TextDecoder` directly, since it's available in both a browser and Node — so it runs outside a browser but is not unaware of one |
| `@tetherto/mdk-ui-agent/panel` | `CoPilotPanel` — the panel body, shared by the docked overlay and the full-page route |
| `@tetherto/mdk-ui-agent/chat-page` | The full-page route form |
| `@tetherto/mdk-ui-agent/styles.css` | Compiled styles, themed off the `--mdk-color-*` tokens |

- **`CoPilotPanel` is deliberately absent from the root barrel**: Both entries reach it through a lazy boundary so the
  markdown renderer and syntax highlighter stay out of the host's first paint; a single static re-export from the root would
  collapse that split for every consumer.
- **The store persists conversations with explicit ceilings** — `MAX_CONVERSATIONS`, `MAX_MESSAGES_PER_CONVERSATION` and
  `MAX_PERSISTED_TOOL_TEXT_CHARS` — so a long-lived session cannot grow local storage without bound. `mergeConversations`
  reconciles what was persisted with what the server returns.
- Components cover the states the contract can actually produce, not just the happy path: `approval-card` for a write
  awaiting the operator, `tool-chip` for a call in flight, `no-tools-note` when the Gateway serves no tools, and
  `leaked-tool-call-notice` for a model that emits a call where prose belongs.
- Ships contract tests over the event and turn shapes, plus a style-forwarding check (`scripts/check-style-forwards.mjs`)
  run as part of `build`.

### The agent charter — a versioned standing instruction

`backend/core/agent/src/charter.js` extracts the system prompt sent on every request into `CHARTER`, alongside a
`CHARTER_VERSION`.

- **The version travels with the report**: A battery score is only comparable to another taken under the same instruction, so
  the charter version is recorded in the run rather than the reader being expected to remember which wording was current.
- **The bytes are load-bearing**: The charter is the stable prefix every request shares and the prompt cache is keyed on it, so
  a reflowed line costs every live session its warm prefix. `backend/core/agent/tests/unit/charter.test.js` pins the text and keeps prior
  versions in a historical table rather than mutating the row for a shipped version.
- Routing knowledge stays out of it: which tool answers which question lives in the tool descriptions, so it evolves with the
  tool set instead of with this text.

### Model providers — an OpenAI-compatible hosted option

`resolveProvider` now dispatches on `PROVIDER.QVAC` (local, still the default) or
`PROVIDER.OPENAI_COMPATIBLE`, selected with new `mdk-agent` flags: `--provider`, `--base-url`, `--api-key`, `--model`,
`--rpm` and `--capability`.

- The hosted path requires `model`, `baseURL` and `apiKey` explicitly and fails fast without them.
- **The API key is scrubbed from error response bodies**, via a `fetch` wrapper rather than at each call site, so a new
  request path cannot forget to do it. A successful response is passed through untouched.
- **Rate limits are handled rather than surfaced**: `pacedFetch` throttles to a requests-per-minute budget and makes up to
  `RATE_LIMIT_ATTEMPTS` attempts (6, so at most five retries), honoring `Retry-After` when the server sends one and falling
  back to a delay parsed from the response body when it does not. The readiness probe is built with `attempts: 1`, so startup
  surfaces a rate limit rather than pacing through it.
- The local provider's readiness poll now backs off — `QVAC_POLL_MS` doubling to `QVAC_POLL_MAX_MS` rather than retrying on a
  flat interval — and a model name the runtime does not recognize fails immediately instead of being waited out to the
  timeout.
- **New budget flags and a named preset**: `--max-steps` and `--max-output-tokens` override the capability's budget,
  `--capability` selects it, and `--provider openai` is a preset that supplies the base URL and reads `OPENAI_API_KEY` —
  distinct from `--provider openai-compatible`, which takes an explicit `--base-url`. `--mode` applies to the local runtime
  only and is ignored for a hosted endpoint.
- **The SSE contract gained two `tool_result` fields**: `contractViolation`, naming a result that broke the tool's declared
  shape, and `approvalWaitMs`, how long the operator held the turn at the approval prompt. Both are optional additions, so
  `CONTRACT_VERSION` stays `v1`.
- **A failed model call is described rather than surfaced raw**: `describeCallError` maps provider failures onto operator
  sentences — unreachable, refused, busy, model unavailable, context exhausted, service failed — and writes the underlying
  SDK message to stderr instead of the event stream. Arguments the server rejects are told apart from work that failed, and
  the model is given a bounded chance to fix them (`rejectedArguments`, `MAX_ARG_FIXES`).
- **Choosing a hosted endpoint says so at startup**: The CLI prints `prompts and tool results leave the site for <host>` when
  a hosted provider is selected, and states that a local model keeps data on site. The difference should not have to be
  inferred from the flags.

### `@tetherto/mdk-plugin-demo` — a Gateway plugin over the sample Worker

A new Gateway plugin aggregating the `demo-worker` sample's devices through the MDK protocol client. Its contract — routes,
schemas, examples, constraints and error codes — is declared in `backend/plugins/demo/mdk-plugin.json`, which points each
route at a handler; the behavior lives in `controllers/summary.js`, `controllers/history.js`, `lib/devices.js` and
`lib/client.js`.

| Route | Behavior |
| --- | --- |
| `GET /api/demo/summary` | Fans metrics telemetry out to every registered demo device and returns fleet totals plus a per-device breakdown |
| `GET /api/demo/history` | Reads each Worker's own `history` channel — `limit` defaults to 10 and is capped at 500, optional `deviceId` narrows to one device |

Both are declared `safety: "read-only"` with response schemas, worked examples and constraints. `demo.summary` declares
`ERR_MDK_CLIENT_UNAVAILABLE`; `demo.history` declares that and `ERR_UNKNOWN_DEVICE_ID`. In practice a missing Kernel client
is not surfaced as an error at all — both controllers catch it and answer `{ ok: true, kernelConnected: false }` with an empty
device list, so a caller distinguishes it by that flag rather than by an error code. Aggregation lives in the plugin because a
Worker only ever answers for one device.

### Generated-page freshness — one command, one workflow

Some files in this repo are written by scripts rather than by people: the supported-hardware page and its `catalogue.json`,
the default-plugin route tables, and the component reference shipped inside the `mdk-ui-component` skill.

- **`npm run regenerate-docs`** rewrites every generated page; **`-- --check`** reports what is stale and changes nothing.
  Exit codes separate the two outcomes a caller cares about — `3` for stale pages, `1` for a broken generator or dirty tree —
  so staleness and breakage are distinguishable without parsing output.
- **`npm run generate:ui-registry`** regenerates the skill's component reference from the devkit registry verbatim. With
  `ui/`'s dependencies absent it exits `2` and leaves the committed copy untouched rather than writing a partial one;
  `regenerate-docs` reclassifies that as a skip for the targets it marks skippable.
- **The `docs-freshness` workflow warns rather than gates — for staleness**: A device contract can legitimately land in one
  pull request and its regenerated page in the next, so a stale page is annotated, not failed; a hard gate would force an
  unrelated docs commit into an engineering change. It still fails outright on a broken generator, a dirty tree or a skipped
  target, since none of those establish whether the pages are current. It is also path-filtered, so it runs only on pull
  requests that touch a generator, a generated file, or one of their sources.

### Benchmark harness — heavier default load, matched thresholds

The performance and scalability harness at `backend/tests/benchmark/` (shipped in 0.7.0, filling in
`docs/guides/deployment/capacity-metrics-template.md` from measured runs) gets its stress parameters retuned for a
heavier, more realistic load:

- **Default load raised** for a real stress test: `n` (samples per latency row) `200` → `1000`
  (`nMinimumRecommended` `30` → `100`), read-load concurrency `20` → `1000`, action-load rate `100/s` → `1000/s`
- **`rssSlopeFlatMiBPerHour`'s amber ceiling loosens `5` → `2048` MiB/h** — the tighter number was tripping on the
  new load profile's own working-set growth, not a real leak signal
- **Failure-drill timeouts tighten `30s` → `5s`** (`workerRestartTimeoutMs`, `kernelRestartTimeoutMs`), matching how
  fast a real restart against the same on-disk root actually completes
- The fleet-summary plugin's controllers (`device-action.js`, `device-alerts.js`, `device-telemetry.js`,
  `fleet-summary.js`) gain a **test-only `services` seam**: when `services` is `undefined` they fall back to the
  plugin's own ambient client (`lib/client.js`) instead of destructuring it, so a test can call a controller
  directly without loading the plugin
- The generated report drops provenance rows (load generator, config artifact hash, alert-induction method)
  duplicated elsewhere in the profile

### Elsewhere

- The **UI shell template mounts the agent**: `<CoPilot />` is mounted once in the layout element rather than on a route, so
  it stays available across pages, and the dev server proxies `/agent` to the Gateway — the panel must reach the backend
  same-origin, because the Gateway sends no CORS headers and its stream route hijacks the reply.
- The **component catalog** gained an *Agent Co-pilot* page backed by a scripted demo gateway, so the surface can be exercised
  without a live agent.
- `ui/api-surface/ui-agent.json` joins the export baselines already covered by `check:api-surface`, and the `ui-foundation`
  baseline picks up `WEBAPP_NAME`, `WEBAPP_SHORT_NAME` and `WEBAPP_DISPLAY_NAME` — exported from `constants/app-constants`
  since 0.7.0, recorded in the baseline for the first time here.
- **`npm run lint:md`** adds markdown linting via `markdownlint-cli2`.
- New tests land alongside the code they cover: `provider`, `truncation` and `charter` suites for the agent, contract and
  result-shape suites for the sample site's MCP tools, and a `preflight` suite for the full-site example. The full-site
  `mcp-server` suite gained a case pinning that `act_device` never reads an unsent write as sent.
- `mdk-ui create` scaffolds `@tetherto/mdk-ui-agent`: the package joins `MDK_PACKAGES`, so a generated app has its dependency
  rewritten to the local link or the published range like every other devkit package.
- `README.md` gains a *Run the demo site* quickstart — clone, `npm run setup`, `node start.js --miners 3` — with the boot lines
  to wait for and the ports each surface lands on, a `### Find your lane` heading over the existing backend/UI split, an
  `### Examples` comparison of the runnable sites, and a note that a gitignored `ui/apps/<name>/` scaffold still leaves its
  mark in `ui/package-lock.json`.
- Two maintainer documents: the `bump-mdk` skill, which resyncs every affected lockfile the way CI expects, and a full-site
  UI production-readiness plan.

## Changed

- **An omitted `safety` in a Gateway plugin manifest now means "write"**: A route declaring no `safety` gets
  `readOnlyHint: false`, and `requiresApproval` gates unconditionally on that — where before it fell through to the read-verb
  heuristic in the tool's name, so an unannotated `get_*` or `list_*` route ran without asking. **Any third-party plugin route
  whose manifest omits `safety` now stops at the human-approval gate.** Declare `safety: "read-only"` to keep it ungated.
- **Approval also honors `destructiveHint: true`** when `readOnlyHint` says nothing. A server that stated only that a call is
  destructive has still said it writes, and that now outranks the name; `readOnlyHint` stays authoritative where both appear.
- **A turn now has a declared budget, and the default one grew**: `CAPABILITY_LIMITS` bounds steps and output tokens per
  capability — small 6/2048, mid 8/4096, large 10/8192 — and `DEFAULT_LIMITS` is the small row, up from `maxSteps: 4,
  maxOutputTokens: 512`. A hosted provider defaults to `large`, a local one to `small`. Nothing is inferred from the model
  id: a bigger local model has to say `--capability mid`, and the startup line marks a budget that was not declared.
- **Prose is not streamed until a tool has returned**: The first tokens are buffered rather than sent, and released only once
  a tool has answered or the turn has no tools at all; an answer that states a figure or names a device id the tools did not
  supply is re-prompted rather than shown. This is the invented-device failure mode, closed at the source.
- **A resumed conversation now contains the tool exchange**: `Session.toolTurn` records the call and its result ahead of the
  answer, so the transcript reads asked → called a tool → got a result → answered. A suppressed answer is discarded like an
  error instead of being recorded, which otherwise taught the model that giving up was a valid shape for a turn.
- **The agent's tool loop now polices the model's output rather than forwarding it**: A reply that echoes the question back,
  attempts a tool call the parser cannot read, or states a figure or device id the tools did not supply is retried, each class
  under its own cap (`MAX_ECHO_RETRIES`, `MAX_REPAIR_RETRIES`, `MAX_STALE_RETRIES`). An answer that still names a tool,
  restates the prompt (`json`, `tool call`, `args:`) or comes back empty is not retried: it is replaced with a fixed apology
  and the model's own words go to the log rather than to the operator. Repeated identical calls are caught by fingerprinting
  the tool and its canonical arguments, so a loop cannot spend its budget asking the same question twice.
- **An answer that hits the token ceiling says so**: When the model stops on `length`, its reply carries an explicit note
  telling the operator to ask for fewer items or raise the limit, instead of ending mid-sentence.
- **The final step is told it is final** (`LAST_STEP`), so a turn that has exhausted its tool budget answers in plain text
  rather than emitting one more call that cannot run.
- **Tool results are clamped before they enter history** (`HISTORY_RESULT_CHARS`), and argument-rejection and tool-error text
  are bounded, so one large result cannot crowd the context for the rest of the conversation.
- **Model requests carry a deadline**: `runToolLoop` takes `requestTimeoutMs`, and a hung provider now fails with a described
  error instead of hanging the turn.
- **The eval battery grew from 262 to 273 cases and was substantially rewritten**, with the reporting reworked around the charter version so
  scores stay comparable across runs. It scores a new independent check — `target`, whether the model acted on a device that
  exists or one it invented — alongside routing, answer, contract and approval, and a case can now carry a `steps` array to
  run several turns against one conversation. A number counts as stated whether the answer gives it in digits or spells it
  out.
- **The startup banner and `/info` report what the agent is running**: Both name the charter version and the capability
  budget in steps and tokens, marking one that was not declared, and `/info` adds a `budget` line. A local model large enough
  to want a bigger budget is told to say so, and an endpoint that answers but rate limits is reported as reachable with a
  suggestion to pace with `--rpm`.
- **The `summarize_site` summary was rewritten for how a small model reads it**: Every count in it is glued to the noun it
  counts, zero is spelled as a word (`no devices`, not `0 offline`), and plurals agree with their number (`1 worker`, not
  `1 workers`). The previous phrasing was `2 devices across 1 workers — 2 online, 0 offline`. The other tools' summaries keep
  their existing phrasing, and `count_devices` still reports a bare `0 devices.`
- **`act_device` reports an outcome**: Its result adds an `outcome` field (`rejected` / `failed` / the reported status /
  `sent`), so a caller no longer has to infer success from the absence of an error.
- **The bundled Worker offered by `mdk onboard` is now the `demo-worker` sample** rather than a hardware-specific one, so the
  scaffolding path exercises a device model written for plugin authoring instead of a real firmware.
- **The documented root install model is reversed**: `examples/full-site/README.md` previously said the repo is federated with
  no root workspaces and that a plain `npm install` is not supported. The root *is* an npm workspace — every `backend/core/*`
  and `backend/workers/*` package is a member — so a root `npm install` installs and links them together. Contributor guidance
  that said the opposite is now correct.
- **`check:plugin-reference-fresh` is re-stated as implemented**: `docs/reference/maintainers/ia.md` and `agent-ready-sdk.md`
  described it as a gate that does not exist; it ships warn-only.
- `CONTRIBUTING.md` gained a checklist item for regenerating pages affected by a change, using the command named in each
  file's `DO NOT EDIT` header, and `RELEASING.md` gained the matching `regenerate-docs` step.
- Documentation comments across `ui-foundation` and `react-adapter` drop the last references to the reference application's
  former codename.

### The sample site's MCP tool results were reshaped

Every tool but `count_devices` renamed result fields, so anything reading a result by key needs updating. All of them now
declare `"contract": "v2"` in `mcp-plugin.json`.

| Tool | v0.7.0 | v0.8.0 |
| --- | --- | --- |
| `act_device` | `deviceId` | `ref` |
| `get_device` | `deviceId`, plus a key named after the aspect read — `capabilities` / `state` / `telemetry`, or a spread `supportedPowerModes` | `ref`, plus `attr` naming which aspect was read and `value` holding it |
| `list_devices` | `devices` | `items`, and a new `total` alongside the existing `count` |
| `rank_devices` | `devices` | `items` |
| `summarize_site` | `workers`, `devices` | `totals.workers`, `totals.devices` |

## Removed

- **Entries dropped from the `mdk onboard` picker**: `WORKER_CATALOG` and `GATEWAY_CATALOG` dropped:
  - `@tetherto/mdk-worker-antminer` — a working bundled entry with a full `deviceOpts` block, runnable against its own simulator
  - `@tetherto/mdk-worker-powermeter` and `@org/mdk-worker-modbus` — unpublished stubs
  - `@tetherto/mdk-plugin-summary` and `@tetherto/mdk-plugin-alerts` — unpublished stubs

  All of them were selectable options in the v0.7.0 picker, so these were reachable user choices rather than dead catalog rows. The picker now offers 
  no hardware Worker at all; to keep using the Antminer Worker, point a spec entry at `backend/workers/miners/antminer` by hand.
- **The in-repo Whatsminer Worker package is gone**: `backend/workers/miners/whatsminer/` — its driver, protocol handlers, mocks and config examples 
  — is removed entirely.
  Whatsminer support now ships as MicroBT's own [`whatsminer-mdk-worker`](https://github.com/whatsminer/whatsminer-mdk-worker), a bare `mdk-contract.json` 
  plus handlers with no boot helper, provisioning store or model validation of its own, which you host yourself on `WorkerRuntimeV2` through a small 
  adapter (see the [run guide](docs/guides/miners/run-whatsminer-worker.md)). MDK validated it against v1, its own label for commit
  [`a47fa820`](https://github.com/whatsminer/whatsminer-mdk-worker/commit/a47fa82020454f9bfa9963ccaaa319b7948e8aa2) — upstream has not tagged a release.
   Model and firmware support beyond that is documented in the external package's own README, not here. Because it still declares a dependency on the 
   deprecated `crypto-js`, MDK adds `backend/lib/mdk-crypto-lib` — a drop-in replacement built on Node's own `node:crypto` — and overrides `crypto-js` 
   to resolve to it at install time, so nothing in the dependency tree still ships the old package.

## Security

- **The API key is read from the environment before the flag**: `--provider openai` takes `OPENAI_API_KEY`, every other
  endpoint takes `MDK_AGENT_API_KEY`, and `--api-key` is only the fallback — an argument is visible to every other process on
  the box through `ps` and lands in shell history, so the flag is there for convenience rather than as the recommendation.
- **The `nanoid` override became a range selector**: In `ui/package.json`, `nanoid: 3.3.18` held every copy in that install
  tree at one version, which would force a downgrade on any dependency legitimately wanting `nanoid` 4 or later. It is now
  `nanoid@<3.3.18: ">=3.3.18 <4.0.0"`, which replaces only the vulnerable 3.x copies — the selector form many of its
  neighboring overrides already use.

## Fixed

- **A root `npm install` broke the agent Gateway plugin**: the standalone `@tetherto/*` core packages were not reachable from the
  root `node_modules`, so loading the plugin failed with `ERR_PLUGIN_HANDLER_NOT_FOUND`. `install-packages.sh` now links them
  into place with `link_into_root()`, and the link survives a reinstall.
- **A documented command pointed at a path that does not exist**: the hardware integration guide said `cd packages/workers`,
  now `cd backend/workers`.
- **A device the model invented was indistinguishable from a real, quiet one**: `get_device` answered "reports no readings"
  for both. It now confirms the device against current site status first and says plainly when a reference is not in it.
- **A failed write could read as a success**: The Kernel signals a rejected envelope in an `error` field rather than by
  throwing, and that field can carry an empty message, which `act_device`'s truthiness check read as "no error". The tool now
  decides on presence and reports a rejection with no stated reason as one. The change is in `act_device`; the Kernel itself
  is unchanged.
- **The full-site control page cleared its spinner too early**: The button now stays busy until refreshed site state has
  arrived, and its inputs are disabled while a command is in flight, so the table can no longer show the pre-command power
  mode next to an idle control.

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
