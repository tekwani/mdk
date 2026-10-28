---
title: Install the CLI
description: "[⏱️ ~3 min] Get `mdk` installed and verified from npm"
docs@tether_slug: guides/cli/install
---

## TL;DR

- Operate the stack from your terminal
- Install `mdk` on your PATH with `npm install -g @tetherto/mdk-cli`
- Confirm it with `mdk --version`

## Overview

`mdk` is MDK's command-line tool for standing up and operating a stack from your terminal. It scaffolds a stack
(`mdk create`), boots it (`mdk run`), and reports its health (`mdk status`), all driven by the `mdk.yaml` spec
`mdk onboard` writes for you.

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]

## Install

Install the published CLI from npm. A source checkout is only needed to work on the CLI itself.

<Steps>

<Step>

### Put `mdk` on your PATH

> [!NOTE]
> If `mdk --version` already prints a version, skip to verifying your install.

#### A Install from npm

```bash
npm install -g @tetherto/mdk-cli
```

> [!TIP]
> `npx @tetherto/mdk-cli@latest <command>` runs a single command without installing anything globally, which suits CI and
> one-off scaffolding.

#### B Install from a source checkout

Contributors who are changing the CLI's own source build it and link that build onto their PATH instead.

```bash
git clone https://github.com/tetherto/mdk.git && cd mdk/packages
npm install
cd cli && npm run build && npm link
```

To pin a tagged release, pick a tag from [mdk tags][mdk-tags] and check it out before installing, for example
`git checkout -b local/v0.12.1 v0.12.1`.

</Step>

<Step>

### Verify the install

```bash
mdk --version
```

</Step>

<Step>

### Run project commands from your project

Commands such as `mdk skill add` and `mdk onboard` write into your current directory, so run them from the app or UI
project you are working in. Only `mdk --version` is global.

</Step>

</Steps>

## Command groups

A selection of commands you can run today:

| Group             | Commands                                |
| ----------------- | ----------------------------------------|
| Onboarding        | `mdk onboard`                           |
| Scaffold          | `mdk create worker\|app\|dashboard`     |
| Add & validate    | `mdk add app\|worker <source>`, `mdk validate app\|worker <name>` |
| Run & manage      | `mdk run [target]`, `mdk status`        |
| Agent enablement  | `mdk skill add`                         |
| Meta              | `mdk version`                           |

The [CLI's command surface][cli-reference] documents the full flag reference.

## Update

```bash
npm install -g @tetherto/mdk-cli@latest
```

> [!TIP]
> Updating a source checkout (option B above) instead: `git pull && npm install && npm run build`.

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
