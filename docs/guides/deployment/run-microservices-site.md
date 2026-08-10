---
title: Run a microservices site
description: Start an MDK site as Kernel, Gateway, and Worker processes supervised by the example's own process manager
docs@tether_slug: guides/deployment/run-microservices-site
notes: in mdk detailed operational changes are kept in package docs to prevent drift from the runnable source
---

This thin page directs you to the correct location for the prerequisites, config fields, run command, smoke test, and troubleshooting.

## Overview

Use the **microservices** site example when you want the Gateway and Workers to run as separate OS processes or containers.

> [!NOTE]
> This page is the task guide for the microservices topology.
> The [deployment topologies][deployment-topologies] concept explains when to choose microservices instead of single-process.

## Use this topology when

- You need supervisor-managed restarts and logs
- You want to restart or scale one service without restarting the others
- You want a production-like layout for Gateway and Workers

## Run the example

Follow the [microservices site example][microservices-example], whose [interactive CLI][microservices-example-cli] starts Kernel, Gateway, and 
each Worker as its own OS process, with per-process logs and status:

- Start with the [prerequisites][microservices-example-prerequisites]
- Bring up every component as a separate process with the [`cli.js` process manager][microservices-example-cli]

## Next steps

- Compare the supported shapes: [Deployment topologies][deployment-topologies]
- Run the simpler local topology — [Run a single-process site][single-process]
- Register a single miner before building a site config — [Run a miner Worker][miner-how-to]

## Links

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[single-process]: run-single-process-site.md
<!-- docs@tether.io: single-process → guides/deployment/run-single-process-site -->

[miner-how-to]: ../miners/index.md
<!-- docs@tether.io: miner-how-to → guides/miners -->

[microservices-example]: ../../../examples/full-site/README.md
<!-- docs@tether.io: microservices-example → https://github.com/tetherto/mdk/tree/main/examples/full-site -->

[microservices-example-prerequisites]: ../../../examples/full-site/README.md#prerequisites
<!-- docs@tether.io: microservices-example-prerequisites → https://github.com/tetherto/mdk/tree/main/examples/full-site#prerequisites -->

[microservices-example-cli]: ../../../examples/full-site/README.md#interactive-cli--process-manager-node-clijs
<!-- docs@tether.io: microservices-example-cli → https://github.com/tetherto/mdk/tree/main/examples/full-site#interactive-cli--process-manager-node-clijs -->
