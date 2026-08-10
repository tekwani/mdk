---
title: Run a container Worker
description: Task guides for running MDK container Workers
docs@tether_slug: guides/containers
---

## Overview

MDK drives each container system through its own Worker. These guides are task-focused and independent, you only need the one for the hardware you 
operate.

> [!NOTE]
> If Kernel, Worker, manager, or thing are unfamiliar, read [terminology][terminology] first.

## Pick your hardware

The authoritative model list for every Worker is the generated [supported-hardware catalogue][catalogue-containers]. Covered so far:

- [Run a Bitdeer Worker][run-bitdeer]
- [Run an Antspace Worker][run-antspace]

## Prerequisites

Every guide assumes:

- Node.js >=24 (LTS)
- npm >=11
- Dependencies installed (`npm run setup` from the repo root)
- Commands are run from the repo root
- Outbound network access for Kernel discovery

For the mock or development path:

- No physical container is required
- The runnable example for your model starts the bundled mock and registers it

> [!IMPORTANT]
> HRPC relies on HyperDHT for peer connectivity. Use the [network requirements and checks][troubleshooting]
> if an example stalls before printing the Kernel key.

For the deployment path:

- A Node.js service or script in your deployment that runs the MDK Worker and registers devices
- A supported container system reachable from the machine or container running the Worker
- The Worker's README for the exact `registerThing` options

## Next steps

- Browse [supported hardware][supported-hardware]
- New to the moving parts? Read [terminology][terminology] (Kernel, Worker, manager, thing, mock)
- If an example does not start or a mock port is busy, use [miner troubleshooting][troubleshooting], the same HRPC and DHT checks apply
- Drive the registered device from a dashboard: [run a mining site end to end][get-started]

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[catalogue-containers]: ../../../backend/workers/docs/supported-hardware.md#containers
<!-- docs@tether.io: catalogue-containers → reference/supported-hardware#containers -->

[supported-hardware]: ../../reference/supported-hardware.md
<!-- docs@tether.io: supported-hardware → reference/supported-hardware -->

[run-bitdeer]: run-bitdeer-worker.md
<!-- docs@tether.io: run-bitdeer → guides/containers/run-bitdeer-worker -->

[run-antspace]: run-antspace-worker.md
<!-- docs@tether.io: run-antspace → guides/containers/run-antspace-worker -->

[troubleshooting]: ../miners/troubleshooting.md
<!-- docs@tether.io: troubleshooting → guides/miners/troubleshooting -->

[get-started]: ../../tutorials/run-a-site.md
<!-- docs@tether.io: get-started → tutorials/run-a-site -->
