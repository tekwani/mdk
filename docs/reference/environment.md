---
title: Environment requirements
description: The Node.js, npm, and Git versions MDK's tooling expects, and why npm stays below 12
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

Check the installed npm version with `npm --version`.

## Why npm stays below 12

npm 12 disables fetching git-based dependencies by default and fails with `EALLOWGIT`:

```text
npm error code EALLOWGIT
npm error Fetching packages of type "git" have been disabled
```

[`examples/mvp-site`][mvp-site] depends on the Whatsminer Worker directly from its
git repository, so `npm install` on npm 12 fails on that dependency before it reaches anything else.

If `npm --version` already reports 12 or higher, repin with:

```bash
npm install -g npm@11
```

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[mvp-site]: ../../examples/mvp-site/README.md
<!-- docs@tether.io: no parity link -->

[mdk-readme]: ../../backend/core/mdk/README.md#trust-and-admission
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#trust-and-admission -->

[hosted-site]: ../guides/deployment/hosted-site.md#gateway-and-kernel-settings
<!-- docs@tether.io: hosted-site → guides/deployment/hosted-site#gateway-and-kernel-settings -->
