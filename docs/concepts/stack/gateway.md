---
title: Gateway
description: The Gateway as a development canvas — extension model, data access, auth design, and Kernel connection
docs@tether_slug: concepts/stack/gateway
todo: "Gap — no how-to for wiring an identity layer into plugin controllers. There are no MDK-defined roles or role strings to document; the only permission vocabulary the stack enforces is Kernel's device-family write perms (miner:w, container:w) read from authPerms"
---

## Overview

This page introduces the [Gateway][gateway-readme] surface. It explains what concerns it owns, how to extend it with plugins and routes,
how data flows from Kernel to your controllers, and why authentication lives here rather than in the kernel.
Read this before building [plugins][plugins-how-to], auth flows, or aggregation routes on top of MDK.

> [!NOTE]
> The Gateway is the backend layer of the [MDK App Toolkit][app-toolkit], which aligns the [plugin system][plugins-how-to]
> and [frontend packages][app-toolkit] into the supported development path for this monorepo.

## What the Gateway owns

The Gateway wraps [`@tetherto/mdk-client`][mdk-client] — the MDK protocol connector to Kernel — and adds an HTTP
interface on top. Consumers connect through the Gateway using `@tetherto/mdk-client`. Agents can reach MDK over MCP through the standalone [`@tetherto/mdk-mcp`][mcp-readme] package.

The Gateway owns concerns that Kernel deliberately **does not** handle:

- The place where authentication belongs: user identity is a Gateway-tier concern: validating callers falls to your plugin controllers and the identity layer you supply
- API surface: REST endpoints and command dispatch
- Fleet aggregation: cross-Worker queries that compute site hashrate, average temperature, and cross-rack efficiency — resolved in controller code, not in Kernel

The [Kernel][kernel-concept] is a pass-through, routing commands to [Workers][workers-concept], collecting telemetry, and maintaining
the device registry. Everything above the kernel — authentication, business logic, API surface — is owned by the caller:
the Gateway (which wraps [`@tetherto/mdk-client`][mdk-client] internally) when using the toolkit.

## Extension model

The Gateway offers two ways to add routes, in order of preference.

### 1. Plugin system

The recommended path. A plugin is a directory with an `mdk-plugin.json` manifest and one or more controller files.
Pass the directory path to `startGateway()` via `extraPluginDirs`.

Controllers receive a `services` bag on every request — `mdkClient`, `dataProxy`, and `conf` — with no protocol knowledge required.
The [default plugins][plugins-readme-defaults] (`telemetry`, `site-hashrate`, `site-monitor`) load automatically. An `auth` plugin ships beside them
but the Gateway neither registers it nor provides the `services.authLib` its controllers expect, so mounting it does not yield working identity
endpoints.

The [plugin authoring guide][plugins-how-to] covers the build process end to end.
The [plugin reference][plugins-readme] documents the manifest schema, controller contract, and loader errors.

### 2. Raw Fastify routes

For one-off handlers that do not need a manifest, pass `additionalRoutes` to `startGateway()`. These are plain Fastify route objects —
no `services` injection, no manifest validation, no auth wiring. Use this path sparingly; a plugin is easier to test in isolation
and easier for a later maintainer to follow.

## Connect without the Gateway

If your use case does not need the Gateway's HTTP surface or plugin system, for example a background service that only
dispatches commands — you can use [`@tetherto/mdk-client`][mdk-client] directly against Kernel without running the Gateway at all.
This is the direct path. Such an approach is not directly supported by this monorepo, as most applications build on the Gateway.

## Data access

Two services are available inside every plugin controller.

**`services.mdkClient`** gives access to live Kernel data: pull a telemetry snapshot, dispatch a command, list registered Workers.
It's `null` when the Gateway starts without a live Kernel connection, so guard it before use.

**`services.dataProxy`** reads from persisted Worker tail-logs: time-series aggregation, historical hashrate, efficiency trends.
Use this for data that does not require a live Kernel round-trip.

The split exists because the two sources have different latency and availability characteristics. `mdkClient` calls are network
operations that can fail if Kernel is unreachable. `dataProxy` reads from local storage and remains available whether Kernel is online or not.

## Authentication design

Neither tier authenticates a user. The Gateway serves whatever routes its plugins declare, to any caller, and Kernel does no user-level
authentication by design. The HRPC connection is an encrypted Noise channel, and [Kernel maintains an allowlist][kernel-transports]; pre v1.0 it is
opt-in (the default `auth.whitelist` is empty and admits any caller), but when configured the Gateway's DHT public key must be added before the
connection is accepted. Once the transport is established, Kernel trusts all messages from the Gateway without inspecting user identity.

User authentication and RBAC belong to the application **you build** on the Gateway. A route is reachable by anyone unless its controller
validates the token and checks permissions itself, so [protecting a route is controller work][plugins-auth]. The `"auth"` and `"permissions"` fields
in `mdk-plugin.json` have no reader and trigger no enforcement.

Kernel does check one thing on the write path: `ActionManager` and `ActionCaller` require the device-family write permission (`miner:w`,
`container:w`) in the `authPerms` array your controller passes with each action, and reject the action with `ERR_ACTION_DENIED` without it.

## Kernel connection

The Gateway is the **active** side of this connection — it dials Kernel. [Kernel][kernel-concept] is the passive listener; it does not
initiate contact with the Gateway.

The connection is [Hyperswarm RPC (HRPC)][hrpc-glossary] — an encrypted peer-to-peer transport addressed by Kernel's public key. What varies is how 
the Gateway obtains that key:

- **Same host (zero-config default)**: Kernel publishes its HRPC public key to a well-known key file (`<tmpdir>/mdk/.kernel-key`)
  on start; the Gateway reads it from there automatically when no key is passed
- **Separate hosts**: pass the key explicitly (`startGateway({ kernelKey })`), obtained from `kernel.getPublicKey()` on the Kernel
  host. When [Kernel's `auth.whitelist`][kernel-transports] is configured, the Gateway's DHT public key must be added to it before
  the connection is accepted

> [!NOTE]
> Pre v1.0, the allowlist is opt-in. Kernel's `auth.whitelist` defaults to empty, which admits any HRPC caller. When an allowlist
> is configured, the Gateway's DHT public key must appear in it before Kernel accepts the connection.

## Next steps

- [Run the Gateway for the first time][run-how-to]
- [Add routes with the plugin system][plugins-how-to]
- Review the [full API and configuration reference][gateway-readme]
- Choose a [deployment shape][deployment-topologies]

## Links

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[kernel-readme]: ../../../backend/core/kernel/README.md
<!-- docs@tether.io: kernel-readme → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[kernel-transports]: ../../../backend/core/kernel/README.md#transports
<!-- docs@tether.io: kernel-transports → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#transports -->

[mdk-client]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[plugins-how-to]: ../../guides/gateway/plugins.md
<!-- docs@tether.io: plugins-how-to → guides/gateway/plugins -->

[plugins-readme]: ../../../backend/core/plugins/README.md
<!-- docs@tether.io: plugins-readme → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md -->


[run-how-to]: ../../guides/gateway/run.md
<!-- docs@tether.io: run-how-to → guides/gateway/run -->

[deployment-topologies]: ../deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[kernel-concept]: kernel.md
<!-- docs@tether.io: kernel-concept → concepts/stack/kernel -->

[workers-concept]: ../architecture.md#workers
<!-- docs@tether.io: workers-concept → concepts/architecture#workers -->

[plugins-readme-defaults]: ../../../backend/core/plugins/README.md#default-plugins
<!-- docs@tether.io: plugins-readme-defaults → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md#default-plugins -->

[plugins-auth]: ../../guides/gateway/plugins.md#auth-and-permissions
<!-- docs@tether.io: plugins-auth → guides/gateway/plugins#auth-and-permissions -->

[app-toolkit]: app-toolkit.md
<!-- docs@tether.io: app-toolkit → concepts/stack/app-toolkit -->

[hrpc-glossary]: ../../reference/glossary.md#hyperswarm-rpc
<!-- docs@tether.io: hrpc-glossary → reference/glossary#hyperswarm-rpc -->

[mcp-readme]: ../../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->
