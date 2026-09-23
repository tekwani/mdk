---
title: Environment requirements
description: The Node.js, npm, and Git versions MDK's tooling expects, and why npm stays below 12
docs@tether_slug: reference/environment
---

## Overview

Every guide and tutorial in this repo assumes the same baseline; this page explains the npm ceiling.

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

[`examples/full-site`][full-site] and [`examples/mvp-site`][mvp-site] depend on the Whatsminer Worker directly from its
git repository, so `npm install` on npm 12 fails on that dependency before it reaches anything else.

If `npm --version` already reports 12 or higher, repin with:

```bash
npm install -g npm@11
```

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[full-site]: ../../examples/full-site/README.md
<!-- docs@tether.io: no parity link -->

[mvp-site]: ../../examples/mvp-site/README.md
<!-- docs@tether.io: no parity link -->
