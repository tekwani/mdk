# Changelog: mdk-0.12.2

## v0.12.2

- Moves the **Ocean minerpool Worker out of this repository** to the partner-maintained `ocean-mdk-worker`, and grows the
  partner Worker registry from 3 entries to 10
- Makes **`permissions` required in `mdk-app.yaml`**, and adds an `mdk-app-rbac` developer skill that derives an app's rules from
  the Kernel calls its code makes
- **Drops three `@bitfinex/*` facilities** from the Kernel, Gateway and core SDK in favour of a `cron-parser` scheduler kept in
  the repository and a direct `lru` dependency
- Reframes the documentation from **"Gateway plugins" to "apps"**, and corrects the install instructions for the device Workers,
  which are not published to npm

## Breaking changes

### The Ocean minerpool Worker moves out of this repository

`backend/workers/minerpools/ocean/` is deleted. The Worker is now partner-maintained at `ocean-mdk-worker`, listed in
[`backend/workers/external-workers.json`](./backend/workers/external-workers.json) and pinned by commit, the same way the other
partner Workers are. `examples/mvp-site` installs it from that pin instead of from the workspace.

Three in-repo references go with it:

| Removed | Where |
| --- | --- |
| `@tetherto/mdk-worker-ocean` | the workspace package, including its mock server, contract and tests |
| `LIB_TYPES.OCEAN_POOL` | `backend/core/mdk/utils/constants.js` |
| the `minerpool-ocean` boot entry (`startOceanPoolWorker`) | `backend/core/mdk/utils/service-bootstrap.js` |

`@tetherto/mdk-worker-ocean` was never published to npm, so nothing changes for an npm consumer. A stack that booted the Worker
from this repository by its `minerpool-ocean` key, or imported `LIB_TYPES.OCEAN_POOL`, installs the partner package and boots it
through its own entry point instead.

### `permissions` is required in `mdk-app.yaml`

`mdk validate app` now fails when an app manifest omits `permissions`, where before the key was optional and only checked when
present. Declare `permissions: []` for an app that makes no Kernel call. The value is the Kernel access the app uses, as RBAC
rules, and the operator reads it when installing the app.

The Kernel does not enforce the rules in 0.12. They become the app's role from the next minor, so a manifest that already matches
its code needs no further change then.

The app scaffold reflects this: `mdk create app` now writes `permissions: [{ resources: [workers], verbs: [list] }]`, matching the
summary route it generates, instead of an empty list.

### The Kernel interval facility is removed

`@bitfinex/bfx-facs-interval` is dropped from the Kernel and the core SDK. `KernelManager` no longer creates or exposes
`interval_0`, and `createFacs()` returns two facilities (`store_s1`, `actionApprover_0`) instead of three. Code that reached for
`kernel.interval_0`, or counted the facilities `createFacs()` returns, schedules its own timers.

### `@tetherto/mdk-react-devkit` declares fewer peers

The peer list goes from seven entries to four: `react`, `react-dom`, `react-hook-form` and `zod`.

| Peer dependency | v0.12.1 | v0.12.2 |
| --- | --- | --- |
| `@hookform/resolvers` | `^5.9.2` | moved to `dependencies` |
| `@testing-library/react` | `^16.1.0` | removed |
| `vitest` | `^4.0.0` | removed |

`npm install @tetherto/mdk-react-devkit` failed with `ERESOLVE` in a fresh project: resolving the `@hookform/resolvers` peer pulled
in its optional schema-adapter chain, which settled on zod 3 and clashed with the devkit's zod 4 peer. The package is only used
inside the devkit's own modals, so it becomes a regular dependency. `zod` stays a peer, since the exported validators return zod
schemas that consumers compose into their own.

`@testing-library/react` and `vitest` were test-only and never needed by a consumer at runtime.

## Added

- **`mdk-app-rbac` developer skill** ([`packages/mdk-skill/src/skills/mdk-app-rbac/SKILL.md`](./packages/mdk-skill/src/skills/mdk-app-rbac/SKILL.md)):
  derives an app's `permissions` from the Kernel client calls its code makes, rather than leaving the author to guess them. Its
  `derive-permissions.mjs` scans the app's sources for Kernel client methods, maps each to the resource and verb it needs, merges
  them into the smallest covering rule set, and prints the evidence for every call site. `--check` exits non-zero when the manifest
  declares less than the code uses, `--strict` also flags access no call needs, and `--write` edits `mdk-app.yaml` in place keeping
  its comments. `references/kernel-access.md` documents the resource, verb and client-method vocabulary.
- **[`docs/reference/supported-workers.md`](./docs/reference/supported-workers.md)**: one catalogue covering miners, containers,
  power meters, sensors and mining pools, partner-maintained and MDK-maintained alike, generated from each Worker's
  `mdk-contract.json`. It replaces `docs/reference/supported-hardware.md`, which covered only devices and left the pools out.
- **Apache-2.0 `LICENSE` file in each of the four UI packages** (`react-adapter`, `react-devkit`, `ui-agent`, `ui-foundation`), so
  the licence travels with the published tarball rather than only with the repository.
- **Pool scheduler unit tests** ([`backend/core/mdk/tests/unit/pool.scheduler.test.js`](./backend/core/mdk/tests/unit/pool.scheduler.test.js)):
  cover an unparseable rule, the fire date passed to the callback, cancellation, and that a far-off cron rule does not arm a
  timer past Node's `setTimeout` ceiling.

## Changed

- **The partner Worker registry grows from 3 entries to 10.**
  [`backend/workers/external-workers.json`](./backend/workers/external-workers.json) adds EMCD, Luxor, LuxOS, Ocean, Proto,
  SealMiner and SpiderPool to the existing Antminer, Foundry USA Pool and Whatsminer entries. Each entry pins the partner
  repository at a commit and names the contract file the catalogue reads.
- **The pool scheduler no longer depends on a scheduler facility.** `PoolService` builds its `scheduler_0` from
  [`lib/services/pool-utils/scheduler.js`](./backend/core/mdk/lib/services/pool-utils/scheduler.js), a cron-string scheduler over
  `cron-parser` that keeps the `add` / `del` / `stop` surface the service already used. Fire dates come from the parser's iterator
  rather than from the current time, so a tick the process slept through still fires once, in order. A delay beyond Node's
  `setTimeout` ceiling of 2^31-1 ms is armed in chunks, where passing it straight to `setTimeout` would clamp it to 1 ms and spin.
- **The Gateway builds its response caches directly.** `WrkServerHttp` constructs five `lru` caches (`lru_10s`, `lru_15s`,
  `lru_30s`, `lru_1m`, `lru_15m`) in its init path instead of registering five `@bitfinex/bfx-facs-lru` facilities. Cache sizes and
  ages are unchanged.
- **The UI package manifests are publish-ready in the repository.** All four carry `license`, `repository`, `publishConfig`,
  `private: false` and a `files` list that excludes `src` tests, specs and test utilities, and their internal `@tetherto/mdk-*`
  dependencies use real `^0.12.2` ranges in place of `*`. The published 0.12.1 tarballs already had most of these fields injected
  at publish time; the repository is now the source of truth for them.
- **The documentation calls Gateway extensions "apps", not "plugins".** The code has used apps since 0.12.0; the prose had not
  caught up. Three pages are renamed with their prose: the Gateway plugin guide becomes
  [`docs/guides/gateway/apps.md`](./docs/guides/gateway/apps.md), the supported-plugins reference becomes
  [`docs/reference/supported-apps.md`](./docs/reference/supported-apps.md), and the `serve-an-endpoint` tutorial becomes
  [`docs/tutorials/see-an-app-serve-data.md`](./docs/tutorials/see-an-app-serve-data.md).
- **The device Worker READMEs no longer claim an npm install that does not work.** Eight Worker READMEs (ABB, Antspace, Avalon,
  Bitdeer, F2Pool, Satec, Schneider, Seneca) said `npm install @tetherto/mdk-worker-<name>`, which returns `E404`: these are
  workspace packages, not published ones. Each now says so and gives the clone-and-install path, pointing at
  [`backend/workers/docs/install-pattern.md`](./backend/workers/docs/install-pattern.md) for what a Worker package ships.

## Removed

- **The per-release notes files.** `docs/reference/release-notes/` and its 13 files are deleted, and the README no longer links
  them. They restated what [`CHANGELOG.md`](./CHANGELOG.md) already records, so the two drifted; the changelog is now the single
  record of what shipped in a release.

## Security

- `fastify` moves to 5.12.7 and `fast-uri` to 4.2.3 through root `overrides`, clearing GHSA-389g-gv7q-r4x8 (`fastify`) and
  GHSA-w74x-v6f9-j3xg, GHSA-wjr9-j795-jxcr, GHSA-xhq7-xmqj-769h and GHSA-333x-w4r6-6crp (`fast-uri`). Three Workers pin `fastify`
  at an exact version and `ajv` asks for `fast-uri@^3.0.1`, so neither moved on a lockfile refresh alone.
- `vite` moves to 6.4.5 in `examples/mvp-site/ui`, clearing GHSA-587h-7wmj-h5pm, GHSA-rq7h-c2jc-7f22, GHSA-r825-w8mm-5pxw,
  GHSA-698v-4r3x-3vcv and GHSA-9jrq-w75r-8gcw.
- `vitest` and its `@vitest/*` packages move to 4.1.12 in `ui`, clearing GHSA-qxg6-89mg-rqv8 and GHSA-xp26-3454-mjgp in
  `@vitest/mocker`.

## Dependencies

| Package | Change |
| --- | --- |
| `@tetherto/mdk-core` | Drops `@bitfinex/bfx-facs-interval` and `@bitfinex/bfx-facs-scheduler`. Adds `cron-parser` 5.10.2 |
| `@tetherto/mdk-gateway` | Drops `@bitfinex/bfx-facs-lru`. Adds `lru` 3.1.0. `@tetherto/svc-facs-httpd` `^2.0.0` to `^2.0.2` |
| `@tetherto/mdk-kernel` | Drops `@bitfinex/bfx-facs-interval` |
| `@tetherto/mdk-react-devkit` | `@hookform/resolvers` moves from `peerDependencies` to `dependencies`. Drops the `@testing-library/react` and `vitest` peers |
| `@tetherto/mdk-react-adapter`, `@tetherto/mdk-ui-agent` | Internal `@tetherto/mdk-*` dependencies move from `*` to `^0.12.2` |
| `examples/mvp-site` | Drops `@tetherto/mdk-worker-ocean`. Adds `ocean-mdk-worker`, pinned by commit |
| Root | Overrides add `fastify` 5.12.7 and `fast-uri` 4.2.3 |

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
