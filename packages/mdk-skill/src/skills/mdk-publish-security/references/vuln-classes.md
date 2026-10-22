# Vulnerability classes and MDK trust boundaries

The manual-review half of `mdk-publish-security`. For each publishable package, walk
every class below, starting from the package's **entry points** (the boundaries
listed first), not from the grep leads. A grep lead tells you where to look; a
finding needs a concrete attacker, a reachable path and an impact.

## Where attacker-controlled data enters MDK

| Boundary | Packages | Who can send data | Notes |
| --- | --- | --- | --- |
| Gateway HTTP (Fastify routes, plugin routes, cached routes, static files, OAuth callback) | `mdk-gateway`, `mdk-core` (`startGateway`) | Any network peer that reaches the bind address; authenticated operators | Every route needs auth + schema validation + body/rate limits |
| MCP tools (stdio / HTTP via `hono`) | `mdk-mcp` | The LLM driving the tools — and therefore anything that reaches its context (device names, logs, pool data) | Treat tool arguments as untrusted; write/command tools need explicit authorisation and must honour manifest `safety` flags |
| HRPC / `@hyperswarm/rpc` over the DHT (Kernel ↔ Worker, client ↔ Kernel) | `mdk-kernel`, `mdk-client`, `mdk-worker`, `mdk-core`, all workers | Any DHT peer that knows/derives the public key, unless the whitelist rejects it | Check: public-key whitelist enforced *before* the handler runs, envelope validated, unknown actions rejected, payload size bounded |
| Device / vendor responses (miner CGMiner API, Modbus/TCP registers, container HTTP APIs, pool REST APIs) | all `mdk-worker-*` (private today; review if one becomes publishable) | A compromised or spoofed device, a MITM on plain-http LAN traffic, the pool/vendor | Responses flow into telemetry, alerts, UI and MCP tool output — validate types and sizes, never `eval`/interpolate them |
| Config files and env (`config/*.json`, `mdk.yaml`, env vars) | all | Local operator (trusted) but often copied from examples | Insecure *defaults* matter here: what happens when a field is missing |
| CLI arguments and scaffold names | `mdk-cli` | The local user, or a script/agent invoking `mdk` | Names reach paths, `package.json`, shell hints |
| Skill content consumed by coding agents | `mdk-skill` | Whoever authors the skill text; the agent executes it | Instructions must not tell an agent to run destructive or network-fetching commands |
| npm consumers (the SDK surface itself) | all | Third-party apps that `require()` the package | Exported APIs must not trust caller input for paths, URLs, or shell; defaults must be safe when options are omitted |
| Browser: data rendered by UI packages (device, container, PDU and pool names, telemetry keys, alerts) | `ui/packages/*` (`mdk-react-devkit`, `mdk-react-adapter`) | Whoever can name or rename a device, a compromised or spoofed worker or device, a third-party worker plugin | Rendered in the operator's authenticated session, so an HTML sink is privilege escalation into device control |
| Browser: LLM output streamed to the UI | `mdk-ui-agent` | Anything that reaches the model's context (prompt injection through device, pool and log data) | Treat every token, tool name, tool arg and tool result as attacker-controlled |
| Browser: URL, storage and session (`?authToken=`, `localStorage`, `sessionStorage`) | `mdk-ui-foundation`, `mdk-react-adapter`, `mdk-ui-agent` | Anyone who can get an operator to open a link; any same-origin script; the next user of a shared browser | Session adoption, token persistence and refresh, cross-user leftovers |

## The 18 classes

For each, the MDK-specific questions to answer. Record **pass**, **issue** (with
`file:line`, attacker, impact, fix) or **n/a** (with the reason) per package.

1. **Authentication/authorization bypass** — Can a route or RPC handler be reached
   with no token, an expired token, or a token for another role? Does the DHT
   whitelist accept an empty list as "allow all"? Are there `skipAuth`/dev flags
   that survive into production?
2. **Missing authorization on API/RPC methods** — Enumerate every registered
   route, RPC `respond()` / action handler and MCP tool. Mark which check gates it.
   Commands that change device state (reboot, power mode, pool switch, Modbus
   write, factory reset) need a write/admin permission, not just "authenticated".
3. **Unsafe input handling** — Are params validated against the contract/manifest
   (type, range, enum, length)? Unbounded arrays, time ranges, page sizes,
   `parseInt` without radix/range, regex built from input (ReDoS).
4. **Injection** — SQL (`better-sqlite3`/sqlite queries with template literals),
   LevelDB/Hyperbee key injection via unescaped prefixes, log injection, header
   injection, template/HTML injection into UI-facing strings, prompt injection into
   MCP tool output.
5. **Command execution** — `child_process`, `shell: true`, `eval`, `new Function`,
   `vm`, dynamic `require()`/`import()` of a path that a config, manifest or request
   can influence (plugin loaders!).
6. **Path traversal** — Plugin `package`/directory resolution, static file serving,
   store/db dirs, scaffold targets, skill install targets, any `path.join(base, x)`
   without `path.resolve` + prefix check. Watch symlinks.
7. **SSRF** — Device `address`/`port` and pool URLs supplied via RPC
   (`registerThing`, config updates) or HTTP, then fetched by the worker. Can a
   caller point a worker at `169.254.169.254`, localhost admin ports or an internal
   host? Redirect following?
8. **Prototype pollution** — Deep merge / `Object.assign` / `obj[key] = v` with keys
   from JSON payloads, query strings, config or device responses. `__proto__`,
   `constructor.prototype`.
9. **Unsafe deserialization** — `JSON.parse` of peer data without try/catch or size
   cap (crash = DoS of the kernel), `v8.deserialize`, YAML `load`, msgpack/compact
   encodings from untrusted peers, reviving class instances.
10. **Sensitive information exposure** — Stack traces, internal paths, config,
    device passwords or pool credentials returned in API/RPC/MCP responses; verbose
    error messages; debug endpoints.
11. **Cryptographic mistakes** — TLS verification disabled, weak hashes/ciphers,
    `Math.random` for ids/tokens/nonces, non-constant-time token compare, keys or
    seeds derived from predictable input, key material written world-readable.
12. **Insecure defaults** — Bind `0.0.0.0` by default, auth off when config omits
    it, permissive CORS, debug on, default passwords (`admin`/`root`) in shipped
    config/README examples, plain-http to devices/pools, unlimited body size.
13. **Trust-boundary problems between SDK and consumers** — Does an exported
    function trust its caller for something it should validate (paths, URLs,
    plugin dirs)? Does the SDK mutate caller-owned objects or globals? Does it
    `process.exit()`, install signal handlers, or read env vars the consumer did not
    opt into? Peer/optional deps that change security posture?
14. **Network/RPC endpoints accepting attacker-controlled data** — List each
    listener (HTTP port, RPC server key, MCP transport, mock servers that might be
    started in prod) and what reaches it without auth.
15. **Privilege escalation** — Can a read-only/operator role invoke admin actions?
    Can a worker (lower trust) make the kernel act on another worker's devices? Can
    a plugin escalate to gateway-wide config?
16. **Race / TOCTOU** — `existsSync` then write; check-then-act on command state
    machines; concurrent state pull / timer reset; action approval flows where state
    can change between approve and execute; temp files with predictable names.
17. **Dangerous filesystem operations** — `rm -rf`/`rmSync({recursive})` on a path
    derived from config or input, `chmod`, symlink following, writing into
    `node_modules`, overwriting user files during scaffold/install.
18. **Secrets exposed through logs or API responses** — Logging of tokens,
    `Authorization` headers, device passwords, pool API keys, DHT seeds/secret keys,
    full config objects, or request bodies containing any of them; audit logger
    redaction.

## UI classes (browser packages)

For packages that run in a browser (`ui/packages/*`), walk these **in addition to** the
18 classes above. Most of the 18 are written for servers, so several are `n/a` for UI
code; these cover what replaces them. Record pass / issue / n/a in the same way.

- **U1. XSS.** `dangerouslySetInnerHTML`, `innerHTML`/`outerHTML`/`insertAdjacentHTML`,
  HTML built as strings (chart tooltips, formatters), markdown or HTML rendering
  (`rehype-raw`, custom remark/rehype plugins), SVG, `style` attributes built from data.
  Trace every device, pool, alert or agent string to the sink.
- **U2. URL injection.** `href`/`src`/`action` built from data (`javascript:`, `data:`),
  `window.open`, `location` assignments, redirect-after-login paths (`//host`), and
  remote resources loaded from data (`<img>` in rendered markdown is an exfiltration
  channel that needs no click).
- **U3. Browser token and credential handling.** Tokens accepted from the URL (any
  `?token=` adopted without a `state` nonce is login CSRF / session fixation), tokens
  in `localStorage` (readable by any XSS), unbounded refresh, sign-out that only
  clears locally, roles parsed client-side and re-sent to the server.
- **U4. CSRF and fetch credentials.** `credentials: 'include'`, cookie auth across
  origins, an API base URL taken from untrusted input, plain-`http` defaults that
  carry a bearer token.
- **U5. postMessage, iframes, `window.opener`.** Message handlers without an origin
  check, embedded frames, `target="_blank"` without `rel="noopener"`.
- **U6. ReDoS and expensive client-side parsing.** Regexes or parsers run on server or
  stream data (unbounded SSE buffers, rescans per chunk), and user text sent to the
  server as a raw regex.
- **U7. Prototype pollution and data-derived keys.** Query/filter builders that turn
  user input into field paths or operators, deep merges of server data, and plain
  objects indexed by server-chosen keys (`__proto__`, `constructor`) that crash renders.
- **U8. eval and dynamic code.** `eval`, `new Function` (also forces CSP `unsafe-eval`),
  `import()` of computed specifiers.
- **U9. Sensitive data in client logs and storage.** `console` output, telemetry or
  error reports carrying tokens or fleet data; transcripts, drafts or queued actions
  persisted across logout or shared between users of one browser.
- **U10. Runtime supply chain.** Unexpected or heavy runtime dependencies, required
  `peerDependencies` that are dev tools (npm 7+ installs them for every consumer),
  scripts, styles or fonts loaded from a CDN, licences of shipped assets (fonts).
- **U11. SSR and Node safety.** `window`/`document`/`localStorage` touched at import
  time; `dist/` ESM with extensionless or directory imports (works only in bundlers,
  fails under Node, SSR and Jest); JSON exports that need `with { type: 'json' }`.
- **U12. What ships.** Tests, fixtures, test utilities importing `vitest`, compiled
  examples, source maps with absolute local paths, examples using monorepo-only
  aliases.

Also check per UI package:
- **Peer vs dependency.** React, `react-dom`, `@tanstack/react-query` and `zustand`
  should be peers when the package shares their context or store with the host.
- **`sideEffects`.** It must match what the package does at import time (CSS imports,
  singletons).
- **React peer range.** Check it is the range you intend to support.
- **Public API disclaimers.** Client-side permission helpers must say they only hide
  UI and do not enforce anything.

## Severity guide

| Severity | Meaning | Publish? |
| --- | --- | --- |
| **Critical** | Remote, unauthenticated code execution, auth bypass, or device control | Block |
| **High** | Authenticated privilege escalation, SSRF/path traversal with real reach, secret leak, a tarball that fails at runtime or ships secrets | Block |
| **Medium** | Insecure default with a safe override, DoS by an authenticated peer, missing hardening that the checklist requires | Fix before publish unless explicitly accepted |
| **Low / Info** | Defence in depth, hygiene, docs | Track |
