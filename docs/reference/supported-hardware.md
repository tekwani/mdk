---
title: Supported hardware
description: The miners, containers, power meters, and sensors MDK supports, plus mining-pool integrations, derived from each Worker's contract.
docs@tether_slug: reference/supported-hardware
---

## Overview

MDK integrates field hardware through Workers. Each Worker declares what it supports in its `mdk-contract.json`. For an MDK-maintained
Worker, that contract is the single source of truth for coverage. For a manufacturer-maintained Worker, [`external-workers.json`][external-workers-manifest]
decides whether it appears in the catalogue at all, and its contract may not enumerate every supported model or firmware version.
Where it doesn't, the manufacturer's own documentation is authoritative, not this page.

## Supported Workers

A Worker contract may be defined by the supplier, such as a hardware manufacturer. Alternatively, MDK may create and support Worker contracts.

### Manufacturer-maintained Workers

Some manufacturers build and publish their own MDK Worker, maintained in their own repository rather than this one. MDK fetches and
schema-validates each manufacturer's `mdk-contract.json` at generation time, so the catalogue reflects the current contract without
copying it into this repo. The manufacturer's own repository, not MDK, is the authority on what device and firmware combinations
it actually supports. See the [generated catalogue][catalogue-full] for the current list and each entry's repository link, and the
[run guide][run-miner-worker] for how a manufacturer-maintained Worker is hosted.

### MDK-maintained Workers

Everything else ships in this repo, with a bundled mock and unit and integration tests.

## Full catalogue

For brand, model list (where the contract enumerates one), and Worker type, see the [generated catalogue][catalogue-full], generated
from every in-repo `mdk-contract.json` plus the manufacturer-maintained list. Where a manufacturer's contract doesn't enumerate models,
the catalogue says so explicitly rather than implying none are supported. Check that manufacturer's own documentation instead.

## Next steps

- [Terminology][terminology]: Kernel, Worker, manager, thing, mock
- [Deployment topologies][deployment-topologies]: decide how to run the Worker service
- [Run a miner Worker][run-miner-worker]: host a manufacturer-maintained or MDK-maintained Worker

## Links

[catalogue-full]: ../../backend/workers/docs/supported-hardware.md
<!-- docs@tether.io: catalogue-full → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/supported-hardware.md -->

[external-workers-manifest]: ../../backend/workers/external-workers.json
<!-- docs@tether.io: external-workers-manifest → https://github.com/tetherto/mdk/blob/main/backend/workers/external-workers.json -->

[terminology]: ../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[deployment-topologies]: ../guides/deployment/index.md
<!-- docs@tether.io: deployment-topologies → guides/deployment -->

[run-miner-worker]: ../guides/miners/index.md
<!-- docs@tether.io: run-miner-worker → guides/miners -->
