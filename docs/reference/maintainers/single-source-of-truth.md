# A single source of truth vision

## TL;DR

Regenerate every generated page in one command, from the repo root:

```bash
npm run regenerate-docs
```

Check whether any of them is out of date without changing anything, which is the step to run before cutting a release:

```bash
npm run regenerate-docs -- --check
```

Porting pages to user docs requires a [port signal](#port-signals) on the source page and access to the private repo.

## Overview

This monorepo attempts to enforce a single source of truth vision. With GHFM, this is challenging, but there are steps that
can be taken to move the docs in this direction.

What is easier is to ensure that the user docs [https://docs.mdk.tether.io/](https://docs.mdk.tether.io/), consume this monorepo's
data rather than risk drift between the two sites.

This page lists the strategies that are in place to enforce a single source of truth philosophy.

1. [Port signals](#port-signals): Entire pages are given porting signals in this repo and a script is available for maintainers to sync the monorepo docs with the user docs.

2. [UI manifests](#ui-manifests): The UI packages generate machine-readable manifests from JSDoc tags and USAGE.md files.

3. [Generation scripts](#generation-scripts): Several scripts read source-of-truth files (mdk-contract.json, mdk-plugin.json, JSDoc) and regenerate documentation so it never drifts from the code.

## Port signals

Authoring conventions for the comment-driven hints that travel with Markdown in this monorepo and drive the future port pipeline to [https://docs.mdk.tether.io/](https://docs.mdk.tether.io/).

This file is the source-of-truth for that vocabulary. Two consumers read it:

- The `check:port-signals` lint gate (see [`ia.md`](ia.md#qa-gates)) — runs in mdk-prv pre-commit / CI and warns when a non-anchor link definition has no routing comment.
- The port-sync transforms in the downstream fumadocs build — rewrite link targets and convert GFM alerts to `<Callout>` JSX on port.

Authoring rule: add the appropriate comment beside each cross-reference or alert. Authors do not need to read this file to write user-facing prose; the only time you need it is when adding a new `[slug]: …` definition or callout block.

### Link slug routing

Reference-style link definitions in `## Links` blocks (or anywhere in Markdown) carry an adjacent HTML comment that tells the port pipeline how to handle the target:

| Comment on the lines immediately below `[slug]: …` | Pipeline action |
|---|---|
| `<!-- docs@tether.io: <slug> → <upstream-path> -->` | Rewrite target to the upstream docs path on tether.io |
| `<!-- docs@tether.io: external link — preserve URL -->` | Keep the URL verbatim (non-Tether external URL) |
| `<!-- docs@tether.io: no parity link -->` | Drop the link; render anchor text as plain text and emit a build warning |
| `<!-- mdk-monorepo: <note> -->` | Internal-only flag (e.g. temp link awaiting a code/README destination); pipeline ignores entirely |
| _(no comment) on `[slug]: #anchor`_ | In-page anchor — preserve verbatim alongside the parent page-to-page mapping |

A non-anchor link definition with **no signal at all** is a pipeline error: the slug has no routing rule. The `check:port-signals` lint gate catches this in mdk-prv before it reaches the port-sync.

A definition may carry **multiple comment lines** (e.g. one `docs@tether.io:` and one `mdk-monorepo:`) — each is read independently.

#### Examples

Outbound mapping to an upstream docs page:

```markdown
[architecture]: ../architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->
```

Preserving a non-Tether external URL:

```markdown
[hypercore]: https://github.com/holepunchto/hypercore
<!-- docs@tether.io: external link — preserve URL -->
```

Monorepo source file — local relative path for IDE navigation, GitHub URL on port:

```markdown
[kernel-package]: ../../backend/core/kernel/index.js
<!-- docs@tether.io: kernel-package → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/index.js -->
```

Engineer-facing code link with no upstream parity:

```markdown
[envelope-impl]: ../../backend/core/kernel/lib/protocol/envelope.js
<!-- docs@tether.io: no parity link -->
```

Code link with a temp flag (target not yet populated):

```markdown
[client-package]: ../../backend/core/client/
<!-- docs@tether.io: no parity link -->
<!-- mdk-monorepo: temp — backend/core/client/ is empty (.gitkeep only) until the SDK port lands -->
```

In-page anchor (uncommented by design):

```markdown
[architecture-section]: #the-kernel
```

### GFM alert → fumadocs `<Callout>`

GitHub renders `> [!TYPE]` blockquote alerts natively; fumadocs uses `<Callout type="…">` JSX. Source files in mdk-prv use GFM so they read correctly on GitHub; the port-sync maps:

| GFM source (mdk-prv) | Fumadocs output (tether.io) |
|---|---|
| `> [!NOTE]`      | `<Callout type="info">`    |
| `> [!TIP]`       | `<Callout type="idea">`    |
| `> [!IMPORTANT]` | `<Callout type="warn">`    |
| `> [!WARNING]`   | `<Callout type="warning">` |
| `> [!CAUTION]`   | `<Callout type="error">`   |

Fumadocs also ships `<Callout type="success">`, which has no GFM equivalent. When an author needs `success` (or wants to override a default mapping for a single block), drop an override comment immediately above the alert:

```markdown
<!-- callout: success -->
> [!NOTE]
> Deployment finished cleanly.
```

The port-sync reads `<!-- callout: <type> -->` directly above `> [!TYPE]` and uses that type instead of the default mapping. Without an override, the table applies. The override comment is invisible on GitHub (HTML comments do not render) so authoring stays GitHub-native.

## UI manifests

Maintainer-facing guide to the UI manifest generation system. For the **agent/consumer** perspective (what the manifests contain, how to query them), read [`ui/AGENTS.md`](../../../ui/AGENTS.md) first. This file covers only the **maintainer workflow** — what gets committed vs. generated, when to regenerate, and how to verify the contract holds.

### What ships vs. what's tracked

The UI packages ship these machine-readable manifests under `dist/`:

| Manifest | Package | What it describes |
|----------|---------|-------------------|
| `registry.json` | `@tetherto/mdk-react-devkit` | Every public component + hook (props, JSDoc, tier, indexes) |
| `blueprints.json` | `@tetherto/mdk-react-devkit` | Intent → recipe map (markdown body included) |
| `hooks.json` | `@tetherto/mdk-react-adapter` | React hooks (store / utility / permission / ui / external) + provider |
| `stores.json` | `@tetherto/mdk-ui-foundation` | Zustand stores (state + actions) and TanStack Query helpers |
| `cli-manifest.json` | `@tetherto/mdk-ui-cli` | The CLI's own command surface (args, options, subcommands) |

See [`ui/AGENTS.md`](../../../ui/AGENTS.md#machine-readable-artifacts) for the full table with subpath imports and CLI commands.

**These are build artifacts, not source files.** The `ui/packages/*/dist/` directories are gitignored — manifests are generated from source on every `npm run build` and never committed to version control. They **are** included in the published npm packages so consumers get manifests that match the installed version.

**Source of truth:**

- `registry.json` / `blueprints.json` — read from JSDoc tags (`@tier`, `@category`, `@domain`, `@kernelCapability`) in component source files, plus co-located `USAGE.md` and `*.example.tsx` files. See the export contract at [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md).
- `hooks.json` — read from JSDoc in [`ui/packages/react-adapter/src/`](../../../ui/packages/react-adapter/src/index.ts) hooks.
- `stores.json` — read from JSDoc in [`ui/packages/ui-foundation/src/`](../../../ui/packages/ui-foundation/src/index.ts) stores.

### When to regenerate

Manifests regenerate automatically as part of `npm run build` in the [`ui/`](../../../ui/README.md) workspace. Turbo's task graph runs `build:registry` as the final step of each package's build, after TypeScript compilation and SCSS bundling complete.

As a maintainter, **you can manually regenerate** before syncing with the user docs.

```bash
cd ui
npm run build:registry
```

To regenerate **and** verify the agent-ready contract holds:

```bash
cd ui
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit
```

This is the same gate that runs in CI on every PR touching [`ui/packages/react-devkit`](../../../ui/packages/react-devkit/README.md). See [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md) for the rules it enforces.

### Socket Firewall note

If your shell routes `npm` through Socket Firewall (`sfw`) and `npm run build:registry` hangs, you may need to source the repo's allowlist. The build process itself doesn't make outbound requests, but if you're running a broader `npm run build` (which includes dev tooling like linkinator during checks), socket.dev will block unrecognized hosts.

Setup instructions: [`linters.md § Nightly and PR diff link verification — linkinator`](linters.md#nightly-and-pr-diff-link-verification--linkinator) (lines 16–28). The same [`scripts/sfw-env.sh`](../../../scripts/sfw-env.sh) allowlist applies.

### PR workflow

When a PR changes component source files (adds JSDoc tags, modifies props, updates `USAGE.md`), the manifests will reflect those changes the next time someone runs `npm run build` — locally or in CI.

**Do not commit `dist/*.json` files.** They're gitignored for a reason: committing them creates merge conflicts and drift. CI rebuilds the manifests fresh on every run, and published packages include the build output automatically.

The IA system described in [`ia.md`](ia.md) references these manifests as the source of truth for UI component tiers, categories, domains, and Kernel capabilities. The proposed `check:facets-fresh` gate (see [`ia.md § QA gates`](ia.md#qa-gates)) would read `dist/registry.json` and emit `dist/facets.json` for catalogue membership.

Until that gate lands (if it lands — adoption is engineering's call), docs maintainers track new agent-ready components manually during IA audits.

## Generation scripts

Three pages in this repo are written by a script rather than by a person. Each reads contract manifests or code annotations and rewrites its page, so what a reader sees
cannot drift from what ships. Hand-editing them does not last, because the next run overwrites the edit.

[`docs/scripts/regenerate-docs.mjs`](../../scripts/regenerate-docs.mjs) runs all three. It orchestrates only, calling each generator where it lives, so engineering keeps
ownership of the generation logic.

### Regenerating

Run from the repo root:

```bash
npm run regenerate-docs
```

The command prints one line per page and names the files it wrote. It runs every generator even when one fails, so a single broken source file cannot hide a second problem.

A full run rebuilds the devkit component registry, so it needs [`ui/`](../../../ui/README.md)'s dependencies and can pull an unrelated diff into a narrow pull request. It is for a
repo-wide pass and for releases.

When one thing has changed, run that generator on its own. Each has its own command:

| Generated page | Command | Run from |
|---|---|---|
| Supported hardware | `npm run generate:catalogue` | [`backend/workers`](../../../backend/workers/README.md) |
| Gateway plugin route tables | `npm run generate:plugin-reference` | [`backend/core/plugins`](../../../backend/core/plugins/README.md) |
| Component reference in the skill | `npm run generate:ui-registry` | repo root |

The two Markdown targets repeat their command in a `DO NOT EDIT` header, which is the reliable route because it travels with the page a person is looking at.
The component reference is minified JSON and cannot carry a comment, so its command is recorded in [`packages/mdk-skill/README.md`](../../../packages/mdk-skill/README.md)
and in `sources.map.json` instead.

### Checking without changing anything

```bash
npm run regenerate-docs -- --check
```

Report mode regenerates into the working tree, compares the result against the last commit, then restores the tree exactly as it was found. It exits non-zero and names the
files when a page is out of date. This is the pre-release check, and it is the only mode that can catch a stale page rather than waiting for someone to suspect one.

Two behaviours are worth knowing:

- Report mode declines to run when a generated file already carries uncommitted edits, because it cannot tell a stale page from work in progress. Commit or stash first
- The component reference needs [`ui/`](../../../ui/README.md)'s dependencies installed. Without them that one target is skipped with a named line in the output, and the other two still run. The
  skip is reported, not fatal, because installing the UI workspace costs hundreds of megabytes and that is a lot to ask of someone who only edits Markdown. Run
  [`npm run setup:ui`](../../../README.md) when you want the third target covered too

### Worker hardware catalogue

Generates the supported hardware tables from Worker contract files, split into two categories, with "Manufacturer-maintained
Workers" listed first in the output:

- Manufacturer-maintained Workers: built by the device manufacturer in their own repository
- MDK-maintained Workers: built in this repo

**Source:** `backend/workers/**/mdk-contract.json` for in-repo Workers, plus every entry in
[`backend/workers/external-workers.json`](../../../backend/workers/external-workers.json) for manufacturer-maintained ones.

**Output:** [`backend/workers/docs/supported-hardware.md`](../../../backend/workers/docs/supported-hardware.md) and its
machine-readable twin [`backend/workers/docs/catalogue.json`](../../../backend/workers/docs/catalogue.json).

**Generator:** [`backend/workers/scripts/generate-catalogue.js`](../../../backend/workers/scripts/generate-catalogue.js), owned by
engineering and runnable on its own with `npm run generate:catalogue` from [`backend/workers`](../../../backend/workers/README.md).

Fetching a manufacturer's contract:

- For each `external-workers.json` entry, the generator reads that manufacturer's `mdk-contract.json` live over HTTPS at
  generation time, using the entry's `repoUrl`, `ref` and `contractPath`.
- Nothing from the manufacturer's repository is installed or executed; only that one file is read.
- `repoUrl` must be a plain `https://github.com/<owner>/<repo>` URL. The fetch goes straight to `raw.githubusercontent.com` with
  no authentication, so today this only works for a public, unauthenticated GitHub repository. A private repo or a non-GitHub host
  is not supported yet.
- Every contract, in-repo or fetched, is validated against
  [`backend/core/mdk-worker/mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json).

Use an immutable commit SHA for `ref`, not a tag or branch:

- A branch moves on every push, as routine behavior.
- A tag is supposed to be immutable by convention, but git does not enforce that: `git tag -f`, or a delete-and-recreate, can
  repoint one, and this happens in practice (for example, re-cutting a botched release under the same tag).
- Either way, what gets fetched and validated next time could silently stop being what was last reviewed. A SHA cannot move at all.

**To add or update a manufacturer-maintained Worker,** edit `external-workers.json` with:

- `name`, `repoUrl`, `ref` (a commit SHA, per above), and `contractPath` (the path to their `mdk-contract.json` in that repository
  at that ref)
- `brand`, `provider` and `family` (one of `miner`, `container`, `power-meter`, `sensor` or `minerpool`): these place the row in
  the right table section and label it even before a fetch succeeds; a successful fetch's own
  `metadata.brand`/`provider`/`deviceFamily` take priority once confirmed

Then regenerate and commit the result; there is no separate registration step.

Failure handling is per-entry and warn-only, matching how in-repo contract validation already worked: an unreachable manufacturer
repository, a missing file at the given ref/path, malformed JSON, or a schema violation is reported (not thrown), and only that one
entry is affected. Every other entry, in-repo or manufacturer-maintained, still generates normally.

> [!IMPORTANT]
> A manufacturer contract that can't be confirmed this run (for example, no network) still gets a row in the output table,
> flagged "not confirmed this run" using only the manifest's own declared fields; it does not silently disappear.
> `npm run generate:catalogue` needs network access to fetch external contracts, so an offline maintainer regenerating locally
> can see that a row wasn't actually re-verified, rather than committing a page that looks like the manufacturer quietly stopped
> being supported.

Reported gaps land in three places:

- stderr on a manual run
- `catalogue.json`'s `conformanceGaps` array, each entry tagged `source: "external"` or `source: "in-repo"`
- a "Contract conformance" section at the bottom of the generated Markdown, naming exactly what to check: network connectivity,
  or the `repoUrl`/`ref`/`contractPath` fields in `external-workers.json`

A genuinely broken generator run, an exception outside the per-entry handling above, still exits non-zero.

None of the above runs on a schedule: the generator only runs from a pull request that touches a file in this repo, so a
manufacturer-side change (the file moves, the repo goes private, a force-push garbage-collects the pinned commit) touches nothing
here and triggers nothing. The `External contract check` workflow (`.github/workflows/external-contract-check.yml`) closes that
gap: nightly, it re-fetches every pinned contract via `npm run check:external-contracts`
([`docs/scripts/check-external-contracts.mjs`](../../scripts/check-external-contracts.mjs)), reusing the generator's own
reachability/schema findings from `catalogue.json`. On failure it fails the run and opens or refreshes an
`external-contract`-labeled tracking issue. Deliberately scoped to breakage (unreachable, private, GC'd SHA, schema violation);
whether a pin is merely stale — still reachable, but behind the manufacturer's latest change to that file — is a related,
separate check tracked as a follow-up.

The [contract validation and catalogue generation process](ia.md#checkintegrations-fresh) covers what the generator checks before it writes.

### Gateway plugin reference

Generates the route tables for default Gateway plugins from their manifest files.

**Source:** `backend/core/plugins/*/mdk-plugin.json`

**Output:** [`backend/core/plugins/README.md`](../../../backend/core/plugins/README.md), within the `BEGIN GENERATED` and `END GENERATED` markers. The prose around the
markers is hand-maintained and the generator leaves it untouched.

**Generator:** [`docs/scripts/generate-plugin-reference.js`](../../scripts/generate-plugin-reference.js), runnable on its own with `npm run generate:plugin-reference` from
[`backend/core/plugins`](../../../backend/core/plugins/README.md)

### Component reference in the mdk-ui-component skill

Keeps the component data shipped inside the `mdk-ui-component` skill in step with the devkit. The skill directs coding agents to this file for component props, so a stale
copy tells an agent to pass props that no longer exist.

**Source:** `ui/packages/react-devkit/dist/registry.json`, itself generated from JSDoc tags, `USAGE.md` files and examples in the devkit's source

**Output:** [`packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry.json`](../../../packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry.json)

**Generator:** [`docs/scripts/sync-ui-registry.mjs`](../../scripts/sync-ui-registry.mjs), which rebuilds the devkit registry and copies it verbatim

The copy is verbatim on purpose. Trimming it to what the skill reads today would create a second shape to keep in step with the devkit's registry schema.

### Freshness in CI

[`.github/workflows/docs-freshness.yml`](../../../.github/workflows/docs-freshness.yml) runs report mode on pull requests that touch either the sources or the generated
pages. It installs the UI workspace and treats a skipped target as a failure, since there a skip means the install broke rather than that someone is working light. It annotates the pull request and never blocks it: a device contract can land in one pull request and the regenerated page in the next, and a hard failure would
force an unrelated docs commit into an engineering change. The pages stay wrong for readers until someone regenerates, so treat the warning as work owed rather than noise.

## Next steps

- [`ui/AGENTS.md`](../../../ui/AGENTS.md): agent/consumer guide for UI manifests (CLI commands, what they contain)
- [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md): export contract every public component must satisfy
- [`agent-ready-sdk.md`](agent-ready-sdk.md): backend/Workers contract (mdk-contract.json, USAGE.md, examples)
- [`ia.md`](ia.md): information architecture and QA gates (check:port-signals, check:facets-fresh, check:integrations-fresh, check:plugin-reference-fresh)
- [`linters.md`](linters.md): link verification and example-path checking gates already wired in CI
