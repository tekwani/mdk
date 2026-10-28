---
title: Environment requirements
description: The Node.js, npm, Git and network baseline every MDK guide assumes, and why npm stays below 12
docs@tether_slug: reference/environment
---

## Overview

Every guide and tutorial in this repo assumes the same baseline; this page explains the npm ceiling. Runtime environment variables
are documented by the package that reads them: the `worker.js` variables in the [core SDK README][mdk-readme], and the full set a
managed site touches in the [hosted-site settings table][hosted-site].

## Requirements

- [Node.js][node] >=24 (LTS)
- npm 11 (< 12)
- Git (latest stable version)
- Outbound UDP to the HyperDHT bootstrap nodes, the [public set on port `49737`][hosted-site-ports] by default or your own private
  list, because [HRPC runs over HyperDHT in every deployment shape, even on one host][hrpc-same-host]. A network that blocks this
  traffic [hangs before the Kernel key is printed][network-checks].

> [!IMPORTANT]
> Across hosts (the [DHT discovery shape][cross-host]), the backend hosts also need [hole-punched UDP][hyperdht] to each other, as the
> [hosted-site port table][hosted-site-ports] lays out.

Check the installed npm version with `npm --version`.

## Why npm stays below 12

npm 12 disables fetching git-based dependencies by default and fails with `EALLOWGIT`:

```text
npm error code EALLOWGIT
npm error Fetching packages of type "git" have been disabled
```

[`examples/mvp-site`][mvp-site] takes several third-party Workers as git dependencies, each pinned to a commit in a
vendor-controlled repository. Its [`package.json`][mvp-site-manifest] carries the current set.

On npm 12, `npm install` fails on the first of these before it reaches anything else. The ceiling lifts only once every
one of them resolves from the registry, so it is not a single pending fix.

If `npm --version` already reports 12 or higher, repin with:

```bash
npm install -g npm@11
```

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[mvp-site]: ../../examples/mvp-site/README.md
<!-- docs@tether.io: no parity link -->

[mvp-site-manifest]: ../../examples/mvp-site/package.json
<!-- docs@tether.io: mvp-site-manifest → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/package.json -->

[mdk-readme]: ../../backend/core/mdk/README.md#trust-and-admission
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#trust-and-admission -->

[hosted-site]: ../guides/deployment/hosted-site.md#gateway-and-kernel-settings
<!-- docs@tether.io: hosted-site → guides/deployment/hosted-site#gateway-and-kernel-settings -->

[hosted-site-ports]: ../guides/deployment/hosted-site.md#networks-and-ports
<!-- docs@tether.io: hosted-site-ports → guides/deployment/hosted-site#networks-and-ports -->

[hrpc-same-host]: glossary.md#hrpc-on-the-same-host
<!-- docs@tether.io: hrpc-same-host → reference/glossary#hrpc-on-the-same-host -->

[hyperdht]: https://github.com/holepunchto/hyperdht
<!-- docs@tether.io: external link — preserve URL -->

[cross-host]: ../guides/deployment/run-all-workers-site.md
<!-- docs@tether.io: cross-host → guides/deployment/run-all-workers-site -->

[network-checks]: ../guides/miners/troubleshooting.md#example-does-not-print-a-kernel-key
<!-- docs@tether.io: network-checks → guides/miners/troubleshooting#example-does-not-print-a-kernel-key -->
