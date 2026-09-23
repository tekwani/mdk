---
title: Install the CLI
description: "[⏱️ ~3 min] Get `mdk` installed and verified from a source checkout"
docs@tether_slug: guides/cli/install
---

## TL;DR

- Operate the stack from your terminal
- Until available as an npm package, link `mdk` on your PATH with:
  - `npm install` at mdk/packages
  - `npm run build && npm link` at mdk/packages/cli

## Overview

`mdk` is MDK's command-line tool for standing up and operating a stack from your terminal. It scaffolds a stack
(`mdk create`), boots it (`mdk run`), and reports its health (`mdk status`), all driven by the `mdk.yaml` spec
`mdk onboard` writes for you.

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]

## Install

Until `@tetherto/mdk-cli` is published to npm, link `mdk` on your PATH from a source checkout.

<details>
<summary>Install the CLI steps</summary>

> [!NOTE]
> If `mdk --version` already prints a version, skip to step 6.

1. Clone the repo and `cd` into `packages`.

   ```bash
   git clone https://github.com/tetherto/mdk.git && cd mdk/packages
   ```

2. Stay on `main`, or pin a tagged release. Pick a tag from [mdk tags][mdk-tags] and check it out.

   ```bash
   git checkout -b <your-branch-name>/v<version> v<version>
   ```

   For example, `git checkout -b local/v0.7.0 v0.7.0`.

3. Install dependencies.

   ```bash
   npm install
   ```

4. Build and link the `mdk` binary.

   ```bash
   cd cli && npm run build && npm link
   ```

5. Confirm `mdk` is on your PATH.

   ```bash
   mdk --version
   ```

6. Run project commands from the app or UI monorepo you are working in. Commands such as `mdk skill add` and
   `mdk onboard` write into your current directory, so run them from your project, not from `mdk/packages/cli`. Only
   `mdk --version` is global once linked.

</details>

## Command groups

A selection of commands you can run today:

| Group             | Commands                                |
| ----------------- | ----------------------------------------|
| Onboarding        | `mdk onboard`                           |
| Scaffold          | `mdk create worker\|plugin\|dashboard`  |
| Run & manage      | `mdk run [target]`, `mdk status`        |
| Agent enablement  | `mdk skill add`                         |
| Meta              | `mdk version`                           |

The [CLI's command surface][cli-reference] documents the full flag reference.

## Update

```bash
git pull && npm install && npm run build
```

## Uninstall

```bash
npm rm -g @tetherto/mdk-cli
```

## Next steps

- Try the [demo][try-the-demo] to see a stack running end to end
- [Build with your agent][agent-skills] so a coding agent knows MDK conventions

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[npm-version]: ../../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[mdk-tags]: https://github.com/tetherto/mdk/tags
<!-- docs@tether.io: external link — preserve URL -->

[agent-skills]: ../ui/agent-skills.md
<!-- docs@tether.io: agent-skills → guides/ui/agent-skills -->

[cli-reference]: ../../../packages/cli/README.md#command-surface
<!-- docs@tether.io: cli-reference → https://github.com/tetherto/mdk/blob/main/packages/cli/README.md#command-surface -->
<!-- mdk-monorepo: temp — points at the package README's command table until the generated /reference/tooling/cli lands, then repoint to that -->

[try-the-demo]: ../../tutorials/run-a-site.md
<!-- docs@tether.io: try-the-demo → tutorials/run-a-site -->
