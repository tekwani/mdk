---
title: Site security blueprint
description: Steps, options, and suggestions for securing an enterprise MDK site assembled from UI, Gateway, Kernel, and Workers
docs@tether_slug: guides/security
---

> [!WARNING]
> Backend keys identify processes, not the people using them. Supply a Gateway `authVerifier` backed by your identity system for
> `"auth": true` routes; other routes do not require it. Kernel checks caller keys and roles. Workers check caller keys without roles,
> and a Kernel role does not follow a key onto a direct Worker connection. Automatic startup can grant access to both. Review those permissions as well as user authentication, TLS, and network policy.
> Treat [`mvp-site`](../../../examples/mvp-site/README.md) and per-family snippets as boot demos, not a production template.

## TL;DR

| Decision         | Suggested production choice    | Demo-only choice                              |
| ---------------- | ------------------------------ | --------------------------------------------- |
| Topology         | Microservices over DHT, three networks (operator / backend / devices) | Single process on loopback |
| Kernel admission | `auth.whitelist` with persistent Gateway and MCP keys, narrowed by role | `allowAll: true` |
| Worker access    | Explicit `allowedKeys`; Kernel client key only if all requests must pass through Kernel; review automatic additions | Same host does not replace the allowlist |
| User identity    | Your SSO or JWTs, checked in the Gateway `authVerifier` | No verifier, `noAuth()` |
| Writes           | Approval-gated for fleet changes; Gateway sets `authPerms` | Direct `sendCommand` with no token |
| UI               | HTTPS, `bearerTokenAuth` or working `gatewayRedirectAuth`, route guards | Vite proxy, `noAuth()`, HashRouter |
| MCP / agent      | Loopback, human approval, real `userId` | Disabled, or loopback with `local` operator |
| Secrets          | Secret manager | Example `admin` passwords                    |

## Overview

Walk the steps to understand how to secure an enterprise site you assemble from MDK: UI, Gateway, Kernel, and Workers on separate hosts or
containers. MDK leaves these controls to you on purpose. The SDK coordinates devices; your site owns who may talk to it.

This page presents what to do, the options MDK gives you, and a suggested default, you will learn about:

- [Network layout](#step-1-choose-a-network-layout)
- [Kernel admission](#step-2-admit-the-gateway-to-kernel)
- [Worker access](#step-3-isolate-workers-and-devices)
- [Gateway identity](#step-4-put-identity-in-the-gateway)
- [Write authorization](#step-5-authorize-writes)
- [UI sessions](#step-6-wire-the-ui-session)
- [MCP and agents](#step-7-optional-mcp-and-the-operator-agent)
- [Secrets and operations](#step-8-handle-secrets-stores-and-day-two-operations)

> [!TIP]
> The companion pages, [security boundaries][security-boundaries] (what each layer trusts) and the [control plane][control-plane]
> (how a request travels) cover related concepts.

## Constraints the SDK does not lift

Build around these. They are inherent to MDK, not optional extras.

| Layer   | What MDK does                                                                          | What you own       |
| ------- | -------------------------------------------------------------------------------------- | ------------------ |
| UI      | Token attachment if you pass an `AuthProvider`; no route guard is applied for you (`RequireAuth` in the devkit is opt-in) | Session, HTTPS, `apiBaseUrl`, hiding write controls |
| Gateway | HTTP router for apps; runs no app code. `"auth": true` routes answer `401` without an `authVerifier`; Host allowlist (loopback), rate limit, Helmet headers, body limit on by default. | `authVerifier` backed by your identity layer, `allowedHosts` |
| App runtime | Runs one app's controllers in its own process. Accepts HRPC callers in `allowedKeys` / `allowedKeyFiles`; no admitted keys means no access. Uses a separate Kernel caller key, granted full access by automatic directory admission. Manifest `permissions` are not enforced. | Explicit incoming callers, Kernel roles for the app's own key, and reviewing the app before installing it |
| Kernel  | Encrypted HRPC. Fail-closed caller allowlist (`auth.whitelist`; empty admits nobody) with `read` / `write` / `admin` roles. Requester and non-admin voter are the transport key. `authPerms` only on approval-gated writes, taken from the caller. | Allowlist entries and roles, mapping verified users to `authPerms` / `voter` on the Gateway |
| Workers | Noise transport and key-addressed HRPC. Fail-closed `allowedKeys`; every admitted key can send supported requests, including commands. No caller roles or human actor in handler context. | Choose direct callers explicitly, review automatic admission, isolate devices, validate payloads, and audit upstream |
| MCP / agent | `POST /mcp` on `127.0.0.1`, no user auth by default (optional bearer `token`). Agent app binds to `local` without an identity layer. | Bind policy, human approval for writes, real `userId` |
| Devices / pools | Vendor protocol APIs and authentication | Device-network isolation |

For operator-facing access, use the Gateway or the standalone MCP server. Keep backend private keys and the Node.js client SDK out of
the browser. Backend scripts can call Kernel or a Worker directly through the [client API][direct-worker-client]; the callee's allowlist
determines whether the call is admitted.

## Blueprint

<Steps>

<Step>

### Step 1: Choose a network layout

Pick a [deployment topology][deployment-topologies] before you write auth code. Isolation is the first control; identity sits on top of it.

#### Options

| Option                 | When to pick it                        | Trade-off                                                |
| ---------------------- | -------------------------------------- | -------------------------------------------------------- |
| Single process         | Local demos, tests, smallest footprint | One heap. A compromise of the process is the whole site. |
| Local (one OS process per service, shared directory) | One machine, production-like restarts, or a step toward microservices | Stronger isolation than a single heap. Kernel and Workers still share the host. No discovery topic; HRPC still runs over HyperDHT. Shared directories participate in admission. |
| Microservices over DHT | Enterprise sites: separate hosts or containers, resource limits per service, Workers away from Kernel | Peers that know the discovery topic can find Kernel and Workers. Key distribution and a Kernel allowlist are mandatory. |

Suggested default: [microservices][deployment-topologies] (one process or container per service, discovery over DHT), with three
networks you define:

- Operator: UI origin and Gateway HTTP, behind TLS and a reverse proxy you control
- Backend: Kernel and Workers on separate hosts, no inbound path from browsers or agents
- Devices: miner, container, meter, and pool APIs, reachable only from the Workers that own them

Pass the Kernel public key to a remote Gateway as `kernelKey`. Treat the DHT discovery topic as deployment configuration, not a
credential: generate a site-specific topic, distribute it out of band, and do not reuse example or well-known values. Pair this
shape with explicit [Kernel caller admission](#step-2-admit-the-gateway-to-kernel) and pinned Worker keys for topic discovery.
Knowing a topic or a listener key does not grant access: unlisted callers are rejected unless `allowAll` is enabled.

Do not pass [`@tetherto/mdk-client`](../../../backend/core/client/README.md) or Kernel keys into the browser. HTTP to the Gateway is the only operator path.

</Step>

<Step>

### Step 2: Admit the Gateway to Kernel

[`auth.whitelist`][kernel-auth-api] defaults to `[]`, which admits **nobody** before startup helpers add keys.
Kernel then checks each admitted caller's role on every request; the [Kernel role reference][kernel-roles] lists the actions each of
`read`, `write` and `admin` permits. A plain key or `kernel.allowKey(key)` without roles grants `admin`.

#### Options

| Option          | When to pick it        | Trade-off                                                                                        |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `allowAll: true` | Throwaway local experiments only | Anyone with the Kernel public key can read telemetry and dispatch commands, skipping the Gateway. Logs a warning. |
| Allowlist the Gateway DHT public key | Every real site | The Gateway store holds that key's seed: guard it like a credential |
| Allowlist Gateway plus extra backend clients | A second `mdk-client` service you trust (batch jobs, a second Gateway, the standalone MCP server) | A plain key is a full (`admin`) Kernel principal; use `{ key, roles: ['read'] }` or `['write']` to narrow it. Review it like a production credential. |

Suggested default: admit only the persistent backend caller keys the site needs, with explicit roles. Disable automatic directory
admission when enforcing that list. Gateway clients, app runtimes, and MCP clients may each use separate keys.

Start a programmatic host with explicit admission and directory-based admission disabled:

```js
const kernel = await getKernel({
  trustedKeysDir: false,
  hrpc: {
    whitelist: [{ key: '<caller-public-key-hex>', roles: ['read'] }]
  }
})
```

Choose roles per backend caller, widen a caller to `write` only when it needs to change devices. Gateway clients use the persistent
`status.rpcClientKey` from the Gateway handle or status file. An app runtime uses its own Kernel caller key, so admitting a Gateway key
does not grant an app runtime access. Treat each store containing identity seeds as a private key: copying it can allow impersonation.

#### Automatic admission during startup

Inspect the [startup admission helpers][trust-and-admission] before relying on a restricted allowlist. The trusted-keys directory stores
public keys, but publishing a key there is an authorization action for the processes watching it.

| Startup path | Kernel caller grants | Worker caller grants |
| ------------ | -------------------- | -------------------- |
| `getKernel()` with directory admission enabled | Admits every valid published caller key except its own client key with `admin`; this can replace an explicit narrower role | This function does not configure Worker allowlists |
| `startGateway({ kernel })` | Calls `kernel.allowKey(gatewayKey)` with full access, even if directory publishing is disabled | An attached `trustKernel()` helper mirrors write-capable grants |
| CLI Worker with a live Kernel, or a host using `trustKernel(runtime, kernel)` | Worker trust does not alter Kernel roles | Admits Kernel's client key and Kernel callers holding `write` or `admin`, now and on later grants |
| CLI Worker in a separate process using `trustKeysFromDir()` | CLI Kernel startup uses the directory admission described here | Admits every valid published key without roles, including a key restricted to `read` on Kernel |
| Supervised Worker through `worker.js` | Does not start Kernel | Combines `MDK_WORKER_ALLOWED_KEYS` with default trusted-directory keys and follows later directory additions |

`getKernel()` uses `<root>/.trusted-keys` by default. The CLI supplies its project-local directory; supervised Workers use
`DEFAULT_TRUSTED_KEYS_DIR` (`~/.mdk/.trusted-keys`). Grant directory write access only to processes you trust to grant backend access.
Filesystem protections restrict who can publish a key; they do not assign that key a narrower role.

For explicit Kernel roles, use `trustedKeysDir: false` on `getKernel()`. To avoid the additional in-process grant, start the Gateway
with `kernelKey` rather than the live `kernel` handle, disable its directory publishing with `trustedKeysDir: false`, and admit its
caller key explicitly. Passing `trustedKeysDir: false` only to `startGateway({ kernel })` does not prevent its full-access grant.
Manage MCP and app runtime keys explicitly as well.

The standalone MCP server (`mdk run mcp`) is a separate Kernel caller with its own persistent key. `mdk run` publishes it to
the trusted-keys dir; on a multi-host site add it to `auth.whitelist` alongside the Gateway, or its tools can't reach Kernel.

Each app runtime is a Kernel caller too, with its own persistent key: `mdk run` publishes it as `app-<name>.pub` in the
trusted-keys dir, next to `kernel.pub`, `gateway.pub`, `mcp.pub` and `cli.pub`. The directory watcher admits valid caller keys with
full access, excluding Kernel's own client key. An app's `permissions` in `mdk-app.yaml` are not enforced by Kernel yet, so review an app
before you add it to a stack.

#### Worker discovery admission

The list of Workers a Kernel may discover is separate from the list of clients allowed to call Kernel.
For DHT-topic discovery, only Worker RPC keys on `discovery.workerKeys` (or added with
`kernel.allowWorkerKey()`) register, and an empty list admits nobody. `discovery.allowAnyWorker: true` admits every
peer that knows the topic; like `allowAll`, it is for throwaway local experiments only and logs a warning. With it, a
peer with the topic could register as a Worker and receive the commands, including credentials, for its device family.

Local shared-directory discovery and explicit `kernel.registerWorker()` skip that topic allowlist. Control who can publish Worker
keys or call registration; adding `discovery.workerKeys` **does not** restrict those paths.

On separate hosts, pass Kernel's public key to the Gateway as `kernelKey`. Do not rely on the well-known key file
(`~/.mdk/.kernel-key`) across machines. Where that file still exists on the Kernel host, it holds the public key, written
world-readable (`0644`) inside a directory you own; it is not deleted on shutdown. Do not expose Kernel's HRPC listener off the backend network.

</Step>

<Step>

### Step 3: Isolate Workers and devices

[`WorkerRuntime`][worker-runtime] rejects unlisted caller keys at connection time and checks the key again on every request.
With `allowAll` disabled, it refuses to start with an empty `allowedKeys` list. This is a key-based firewall, not a list of allowed
server addresses. An admitted key can send any request the Worker supports, including `command.request`; the list has no read-only role.

Choose which request paths the site allows:

| Path | Checks that apply | Consequence |
| ---- | ----------------- | ----------- |
| Client to Kernel to Worker | Kernel caller key and action role, [Kernel command handling][kernel-command-dispatcher], then the Worker's allowlist for Kernel's client key | Kernel mediates the request; approval runs only for the approval-gated action path |
| Client directly to Worker | Worker's caller allowlist, request validation, and Worker handlers | Kernel roles, command lifecycle records, and its approval flow do not run |

The [direct Worker client][direct-worker-client], `sendWorkerCommand()` and `pullWorkerTelemetry()` use the second path. Resolving a
Worker's public key through Kernel does not make the following Worker call Kernel-mediated. The caller still needs a key admitted by
that Worker. This is separately granted access, not a way around the Worker's firewall.

For example, a monitoring script admitted to Kernel as `read` cannot send a command through Kernel. If its key is also on a Worker's
allowlist, the same script can send supported commands directly to that Worker. To keep it read-only, restrict both paths.

For a site that requires all device requests to pass through Kernel, set each Worker's `allowedKeys` to only
`kernel.getClientPublicKey()`, not Kernel's listener key from `getPublicKey()`. Do not add the Gateway, MCP, app runtime, or script key
to that list. If the site deliberately needs direct provisioning or Worker queries, admit the required caller explicitly and treat it
as able to issue supported commands too.

> [!IMPORTANT]
> An initial `allowedKeys` list is not an exclusive policy when a trust helper adds more keys afterward. The CLI installs
> `trustKernel()` / `trustKeysFromDir()` automatically, and `worker.js` adds trusted-directory keys even when
> `MDK_WORKER_ALLOWED_KEYS` is set (additive, not an override). Kernel-only access needs a programmatic host with explicit
> Worker boot options and neither helper.

Keep the Worker firewall enabled and isolate the network as an additional control. [Security boundaries][security-boundaries] explain
the distinction between endpoint identity, key admission, and user authentication.

#### Options

| Option                                               | When to pick it | Trade-off                                                                   |
| ---------------------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| Workers only on the Kernel network, keys unpublished | Every site      | Operational discipline: no Worker port or DHT topic on the operator network |
| One Worker process per trust zone | Different device families or vendors must not share credentials | More processes to supervise                    |
| Device APIs on a third network (CGMiner `4028`, miner HTTP, container APIs) | Real hardware | Required when the vendor protocol has weak or no auth ([Avalon][run-avalon] / CGMiner have none; [Antminer][run-antminer] uses digest auth; [Whatsminer][run-whatsminer] uses a device password) |

Suggested default: persist each Worker's `storeDir` so its key is stable, treat that key as a machine identity, and register the Worker
with Kernel only after the device network is isolated. On DHT, keep Worker public keys and the discovery topic off the operator network
and out of git. Inject device passwords and pool API keys from a secret manager or protected environment. Never put secrets in
`mdk-contract.json`, git, or a committed seed file.

Validate command payloads again in the handler (types, ranges, allowed targets). Kernel checks the command name against the contract;
it does not know your hardware's unsafe parameter combinations. Redact credentials and vendor responses in handler errors and logs.
For CGMiner-style devices, network isolation is the control: changing the Worker `password` field does not add a wire handshake the
protocol lacks.

</Step>

<Step>

### Step 4: Put identity in the Gateway

The Gateway is the only supported user-auth seam. Pass `startGateway()` an `authVerifier(request, route)` backed by your identity layer:
routes a manifest marks `"auth": true` answer `401` unless it returns an identity, which controllers read as `req._info`. Routes without
`"auth": true` are served to any caller. Paths under `/auth/metrics/*` are historical names, not a login gate.

#### Options

| Option                                  | When to pick it | Trade-off                             |
| --------------------------------------- | --------------- | ------------------------------------- |
| Your SSO (OIDC / SAML / existing IdP), validated in the `authVerifier` | Production sites with an identity provider | You write the verifier and mark routes `"auth": true`: this is the supported path |
| Gateway-issued JWT after an OAuth redirect you implement (`/oauth/...` → `?authToken=`, plus `POST /auth/token` and `/auth/userinfo`) | Browser UI using `gatewayRedirectAuth({ oauthBaseUrl })` | You still write those routes |
| Bearer tokens only (`Authorization: Bearer`), no browser redirect | Service accounts, scripts, or a UI that already has a token | Pair with `bearerTokenAuth()` in the UI |
| No identity (`noAuth()`, no `authVerifier`) | Laptop demos bound to loopback | `"auth": true` routes stay closed; every other route is open to anyone who can reach the port |

Suggested default: one `authVerifier` for the whole Gateway, and `"auth": true` on every route that reads or changes the fleet. Map
verified roles onto Kernel `authPerms` (`miner:w`, `container:w`, and any others you define). Never accept `authPerms` or `voter` from
the HTTP client. Return `false` for a missing or bad token (`401`) and throw a `403` `ERR_*` error for a missing permission.

```js
// The verifier does the check; the Gateway apps guide owns the full example.
authVerifier: async (request, route) => {
  const identity = await verify(request.headers.authorization)
  if (!identity) return false
  if (!(route.permissions || []).every(p => identity.perms.includes(p))) {
    throw Object.assign(new Error('ERR_AUTH_PERM_DENIED'), { statusCode: 403 })
  }
  return identity
}
```

> [!NOTE]
> The Gateway sanitizes error bodies: only `ERR_*` codes and Fastify's own 4xx errors reach the client verbatim; the
> [Gateway security model][gateway-security] details the shape and what gets logged instead.

The [Gateway apps guide][plugins-auth] owns this pattern. Also:

- Bind HTTP to the proxy network, not a public interface without that proxy
- List the names clients use in `allowedHosts`; only loopback on the bound port passes the Host check by default
- Tune `rateLimit` for writes. `?overwriteCache=true` is honored only for an identity
  whose `perms` holds `cache:overwrite`
- `trustProxy` is off by default. Turn it on only behind a proxy whose hop count you trust, or client IPs (and so rate limits) can be spoofed
- Log actor, route, target, command, outcome, and a correlation id for every write. Redact secrets. Worker handlers cannot see
  actor identity, so this audit stays in the Gateway

</Step>

<Step>

### Step 5: Authorize writes

Kernel distinguishes a command sent to Kernel (`command.request`) from an approval-gated action (`action.push` and votes).
Both require a Kernel caller role of `write` or `admin`. A command sent directly to a Worker is a third path with only the Worker
checks described in Step 3. Choose the path per action and enforce that choice at every entry point you admit.

Kernel's role check authorizes the backend process, not the person behind an HTTP request. For commands sent to Kernel, the Gateway
or app controller must authorize that person. Approval-gated writes also check `authPerms`, but the admitted caller supplies that array;
derive it from verified identity. Non-admin callers vote as their transport key; an `admin` caller may forward a user's `voter` identity.
Grant that delegation only to a process trusted to authenticate those users.

#### Options

| Option                                | When to pick it | Trade-off                               |
| ------------------------------------- | --------------- | --------------------------------------- |
| Command to Kernel (`command.request`) after a controller permission check | Low-impact, operator-in-front actions (LED, a single-device reboot you already authorized) | Requires a write-capable backend key; no approval vote or human-identity check runs in Kernel |
| Approval-gated write ([`action.push`][kernel-action-manager], then votes) | Fleet-changing actions: power mode, pool assignment, container PDU, bulk reboot | Slower. Still requires the Gateway to set `authPerms` and `voter` from the verified token. The [write-actions guide][write-actions] covers the HTTP side. |
| Agent-proposed write with a human approval pause | Operator agent (`approvalTimeoutMs` on [`@tetherto/mdk-app-agent`](../../../backend/apps/agent/README.md)) | The model cannot execute a write until someone approves. Without identity, every request is the same `local` operator. |

Suggested default: approval-gated writes for anything that changes hash, power, or network membership; direct commands only behind a
controller that already checked a token. Do not expose a raw `sendCommand` route to the UI without that check.

</Step>

<Step>

### Step 6: Wire the UI session

[`<MdkProvider auth={...}>`][mdk-provider-auth] is how the browser attaches a credential. The toolkit does not guard routes or deny writes on its own.

#### Options

| Option                                  | When to pick it | Trade-off                             |
| --------------------------------------- | --------------- | ------------------------------------- |
| `noAuth()` | Local dev against a Gateway without an auth plugin, demos | No token. A finished-looking dashboard still sends unauthenticated calls. |
| `bearerTokenAuth()` | You already issue JWTs from the Gateway identity plugin | Session ends on `401`. You own login UI. |
| `gatewayRedirectAuth({ oauthBaseUrl })` | OAuth redirect, `?authToken=` capture, refresh against `POST /auth/token` | Needs *your* token routes. Default `MdkProvider` auth without `oauthBaseUrl` cannot sign in. |
| Custom `AuthProvider` | A session model the three presets do not cover | You implement `getToken`, refresh, and sign-out |

Suggested default for a production dashboard:

- `<MdkProvider apiBaseUrl={httpsOrigin} auth={bearerTokenAuth()}>` or `gatewayRedirectAuth({ oauthBaseUrl })` after those routes exist
- HTTPS, a real `apiBaseUrl`, no Vite dev proxy
- One fetch client so pages cannot skip `Authorization`
- Route guards on any view that can mutate the fleet (the shell template uses `<RequireAuth>`; copy that idea, not `noAuth()`)
- Hide write controls unless the token carries the matching permission. Hiding is not authorization; the Gateway still denies
- Scrub `?authToken=` from the URL after capture. Tokens in query strings leak through access logs and Referer
- Static bundle behind the same proxy that terminates TLS. Do not run `vite dev` as the production UI

The mvp-site example UI has no sign-in, no session, and a hardcoded profile. Do not copy that into a reachable host.

</Step>

<Step>

### Step 7: (Optional) MCP and the operator agent

MCP is optional. When you enable it, it has the same authority as the process that hosts it. The standalone [`@tetherto/mdk-mcp`](../../../backend/core/mcp/README.md)
process binds `127.0.0.1` and answers `POST /mcp` with no user auth by default; an optional bearer `token` gates every call. The
Gateway hosts no MCP itself.

#### Options

| Option           | When to pick it             | Trade-off                                         |
| ---------------- | --------------------------- | ------------------------------------------------- |
| No MCP, no agent | Dashboards and scripts only | Smallest surface                                  |
| MCP on loopback, operator agent on the Gateway | In-process chat for people who already passed Gateway identity | Keep `approvalTimeoutMs` on. Pass a real `userId` into `createSession` / `resumeSession`. A session id in a URL must not read another operator's chat |
| MCP or agent published past localhost | An agent runtime on another host | MCP does not identify individual users; its optional bearer token grants shared access. Put mutual TLS or your SSO proxy in front, and authorize inside the reused HTTP handlers (an app's routes served as MCP tools run the same handlers under one server-wide `identity`, with no per-user check; `auth: true` tools stay hidden unless that identity is configured) |

Suggested default: leave MCP on `127.0.0.1`. Do not publish it with compose `ports:`, an SSH tunnel, or a reverse proxy unless that
front door is authenticated. Treat the model provider (`qvac` or an OpenAI-compatible URL) as sensitive infrastructure: prompts can
include site topology and, if you are careless, secrets.

</Step>

<Step>

### Step 8: Handle secrets, stores, and day-two operations

#### Options for secrets

| Option               | When to pick it | Trade-off                                                |
| -------------------- | --------------- | -------------------------------------------------------- |
| Secret manager (Vault, cloud SM, Kubernetes secrets) into the host process | Production | Extra moving part. This is the suggested default. |
| Protected environment on a locked-down host | Small single-host sites | Rotation and audit are your scripts |
| Values in git, `mdk-contract.json`, example `site.deploy.json`, or the UI bundle | Never | Credentials leak with the repo or the browser |

#### Options for process lifecycle

| Option                                    | When to pick it | Trade-off                           |
| ----------------------------------------- | --------------- | ----------------------------------- |
| `SIGINT` / supervisor stop so WAL and cleanup run | Always | A `SIGKILL` can leave `.mdk-data` / `storeDir` unusable. The next boot may look healthy with zero Workers. |
| Health check HTTP only (an HTTP route the Gateway serves) | Insufficient | The Gateway keeps serving HTTP while the Kernel is unreachable; Kernel-backed routes fail with `ERR_MDK_CLIENT_UNAVAILABLE` until it is back. |

Suggested default:

- Mode `0700` (or equivalent) on the Kernel db directory and Worker `storeDir`, and `0600` on seed and key files. Encrypt at rest if the host requires it.
- Back up those directories as operational data, with the same access control as the live files
- Rotate keys when access changes, and update every callee that admits them, including direct Worker grants
- Practice recovery from a wiped data directory before an incident
- Watch Gateway-to-Kernel errors, not only the HTTP port
- Run Node.js >=24. Pin lockfiles. Prefer non-root containers with a read-only root filesystem
- Stay on the latest `main` or latest tag you have reviewed. `0.y.z` is initial development; older tags may not receive security
  fixes. Report product issues through the [security policy][security-policy], not public GitHub issues

#### Revoke access on every admitted path

Trusted-directory watchers add keys; deleting a `.pub` file does not revoke its grants in running processes. Use `kernel.revokeKey(key)`
and each affected `runtime.revokeKey(key)`, and remove the publication and startup configuration that would grant it again.
With `allowAll` enabled, removing an allowlist entry does not deny that caller; disable `allowAll` as well.

`trustKernel()` mirrors explicit Kernel revocations to attached Workers, but changing a Kernel role from `write` to `read` does not
remove an existing Worker grant. A directory watcher does not mirror Kernel role changes or revocations. Check the live Kernel roles
and Worker allowlists, not just files on disk, and verify that denied calls fail after revocation and after restart.

</Step>

</Steps>

## Next steps

- Read the [security boundaries][security-boundaries]: what each layer trusts, and what it does not
- Follow the [control plane][control-plane]: read path, direct command, and approval-gated write
- Add identity in [app controllers][plugins-auth]: the only supported user-auth seam
- Restrict Kernel callers with the [HRPC allowlist][kernel-auth-api]: transport admission for the Gateway
- Compare [deployment topologies][deployment-topologies]: this blueprint assumes microservices; local and single-process are smaller footprints
- Apply the blueprint as values with the [hosted-site reference configuration][hosted-site]: two profiles and one settings table
- Report product vulnerabilities through the [security policy][security-policy]: private advisory, not a public issue

## Links

[security-boundaries]: ../../concepts/security-boundaries.md
<!-- docs@tether.io: security-boundaries → concepts/security-boundaries -->

[control-plane]: ../../concepts/control-plane.md
<!-- docs@tether.io: control-plane → concepts/control-plane -->

[deployment-topologies]: ../../concepts/deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[hosted-site]: ../deployment/hosted-site.md
<!-- docs@tether.io: hosted-site → guides/deployment/hosted-site -->

[plugins-auth]: ../gateway/plugins.md#auth-and-permissions
<!-- docs@tether.io: plugins-auth → guides/gateway/plugins#auth-and-permissions -->


[write-actions]: ../gateway/write-actions.md
<!-- docs@tether.io: write-actions → guides/gateway/write-actions -->


[security-policy]: ../../../SECURITY.md
<!-- docs@tether.io: security-policy → https://github.com/tetherto/mdk/blob/main/SECURITY.md -->

[worker-runtime]: ../../../backend/core/mdk-worker/README.md
<!-- docs@tether.io: worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md -->

[kernel-command-dispatcher]: ../../../backend/core/kernel/README.md#commanddispatcher
<!-- docs@tether.io: kernel-command-dispatcher → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#commanddispatcher -->

[kernel-action-manager]: ../../../backend/core/kernel/README.md#actionmanager
<!-- docs@tether.io: kernel-action-manager → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actionmanager -->

[kernel-auth-api]: ../../../backend/core/kernel/README.md#caller-admission-and-roles
<!-- docs@tether.io: kernel-auth-api → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#caller-admission-and-roles -->

[kernel-roles]: ../../../backend/core/kernel/README.md#caller-admission-and-roles
<!-- docs@tether.io: kernel-roles → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#caller-admission-and-roles -->

[trust-and-admission]: ../../../backend/core/mdk/README.md#trust-and-admission
<!-- docs@tether.io: trust-and-admission → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#trust-and-admission -->

[direct-worker-client]: ../../../backend/core/client/README.md#createworkerclientrpckey-hrpcopts--client
<!-- docs@tether.io: direct-worker-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#createworkerclientrpckey-hrpcopts--client -->

[mdk-provider-auth]: ../../../ui/packages/react-adapter/README.md#authentication
<!-- docs@tether.io: mdk-provider-auth → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md#authentication -->

[gateway-security]: ../../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: gateway-security → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[run-avalon]: ../miners/run-avalon-worker.md
<!-- docs@tether.io: run-avalon → guides/miners/run-avalon-worker -->

[run-whatsminer]: ../miners/run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer → guides/miners/run-whatsminer-worker -->

[run-antminer]: ../miners/run-antminer-worker.md
<!-- docs@tether.io: run-antminer → guides/miners/run-antminer-worker -->
