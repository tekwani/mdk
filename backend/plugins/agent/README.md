# @tetherto/mdk-plugin-agent

Gateway plugin that mounts [`@tetherto/mdk-agent`](../../core/agent/README.md) as an auth-gated chat API: sessions, SSE
message streams, and approval round-trips for its write tools.

> [!TIP]
> The [Gateway agent guide][agent-guide] covers enabling this plugin and driving a session end to end.

## Configuration

The manifest's `setup` block asks for these values, read from `config.agent` at `require('@tetherto/mdk-gateway/plugin')`:

| Key              | Status   | Type     | Default | Description                                                             |
| ---------------- | -------- | -------- | ------- | ----------------------------------------------------------------------- |
| `agent.provider` | Required | `object` | None    | The model the agent talks to, per the [provider shape](#provider-shape) |
| `agent.mcp`      | Optional | `object` | None    | The MCP tool server the agent calls fleet tools through. Omitting this, or its `url`, still loads the plugin: the agent runs as a grounded chat with no fleet tools, and [why that happens](#troubleshooting) has its own entry. |
| `agent.approvalTimeoutMs` | Optional | `number` | `120000` | How long a paused write waits for a decision before it resolves to rejected |

### Provider shape

`agent.provider` ([`provider.js`](../../core/agent/src/provider.js)):

| Key        | Status   | Type     | Default | Description                                          |
| ---------- | -------- | -------- | ------- | ---------------------------------------------------- |
| `kind`     | Required | `string` | None    | `'qvac'` or `'openai-compatible'`. `'qvac'` in `external` mode wraps any server speaking `/v1/chat/completions`, so it is the right kind for a non-QVAC local endpoint too; `'openai-compatible'` is for a **hosted** one and additionally requires `apiKey`, adding key redaction and rate-limit pacing |
| `model`    | Required | `string` | None    | The model id served or connected to |
| `mode`     | Optional | `'external'` or `'managed'` | `'external'` if `baseURL` is set, else `'managed'` | Picks how the agent reaches the model |
| `baseURL`  | Optional | `string` | None    | Required in `external` mode: the URL of an already-running OpenAI-compatible server |
| `apiKey`   | Optional | `string` | `qvac`  | Used only in `external` mode |
| `modelConfig` | Optional | `object` | `{ ctx_size: 16384, reasoning_budget: 0 }` | Used only in `managed` mode; overrides `qvac serve`'s own defaults, which are too small to use as-is |

**`external`** connects to an already-running OpenAI-compatible server at `baseURL`, any such server and not only QVAC's own.
**`managed`** has the agent spawn and own the QVAC server itself for `model`, which needs the agent and the GPU on the same OS.

[Mount the plugin][mount-the-plugin] demonstrates a complete, schema-correct `mdk.yaml` example, running this plugin standalone
against an MCP tool server run elsewhere.

## Routes

| Route                   | Method + path                                    | Notes                 |
| ----------------------- | ------------------------------------------------ | --------------------- |
| `agent.session.create`  | `POST /agent/sessions`                           |                       |
| `agent.session.message` | `POST /agent/sessions/:id/messages`              | `text/event-stream`; events carry `turnId`, `seq`, and `approvalId` on `pending_approval` |
| `agent.approval.decide` | `POST /agent/sessions/:id/approvals/:approvalId` | Fail-safe timeout resolves to reject |
| `agent.session.delete`  | `DELETE /agent/sessions/:id`                     |                       |

Sessions bind to the caller's identity from `req._info.user`, or to a single `local` operator when no auth plugin stamps one.
A session id and its approvals are only reachable by the identity that created them; a foreign id reads as missing rather than
forbidden, so existence never leaks.

[`tests/plugin.test.js`](tests/plugin.test.js) is the executable spec for this contract: envelope stamping, the approval
pause and resume order, the timeout-rejects path, and per-identity isolation across sessions and approvals.

## Errors

| Code                          | Fires when                                 | Fix                     |
| ----------------------------- | ------------------------------------------ | ----------------------- |
| `ERR_AGENT_UNAVAILABLE` | `config.agent` is missing entirely, or the agent failed to construct — a bad provider config, or the MCP server was unreachable at startup (`503`) | Add the `agent` block to this plugin's config, or fix the provider/MCP config the underlying error names |
| `ERR_AGENT_SESSION_NOT_FOUND` | The session id doesn't exist, or belongs to a different caller than the one making the request (`404`) | Create a new session, or confirm you're using the identity that created this one |
| `ERR_AGENT_TURN_ACTIVE`       | A message or delete is sent to a session while its previous turn is still streaming or paused on an approval (`409`) | Wait for the current turn to finish, or decide its pending approval, before sending another |
| `ERR_AGENT_APPROVAL_NOT_FOUND` | The approval id doesn't exist for that session — already decided, timed out, or never existed (`404`) | Check whether it already resolved; approvals also auto-reject after `agent.approvalTimeoutMs` |
| `ERR_AGENT_MESSAGE_TEXT_REQUIRED` | `agent.session.message`'s `text` field is missing, not a string, or empty after trimming (`400`) | Send a non-empty `text` string |

## Troubleshooting

| Symptom                        | Cause                             | Fix                          |
| ------------------------------ | --------------------------------- | ---------------------------- |
| Sessions and messages work, but the agent never calls a tool | `agent.mcp` (or its `url`) is omitted | Set `agent.mcp.url` to a reachable MCP server; [`createAgent`](../../core/agent/README.md) only connects to MCP when `config.mcp.url` is set, and without it the agent runs as a grounded chat with no fleet tools |
| Same symptom, but `agent.mcp.url` is set correctly | The MCP tool server was still starting, or unreachable, at the exact moment the session was created; the agent connects to MCP once, at session create, and never retries later in that session's life | Confirm the tool server is up, then create a new session; restarting or messaging the existing session does not retry the connection |
| `npm ci` fails to resolve a stack that mounts only this plugin | `@tetherto/mdk-plugin-agent` declares `@tetherto/mdk-agent` as a required dependency, not an optional peer | Install `@tetherto/mdk-agent` alongside the plugin so `npm ci` can resolve it |

## Next steps

- [Enable the agent through the Gateway][agent-guide]: onboarding, mounting, and driving a session with curl
- [Understand the underlying agent](../../core/agent/README.md): the model, its tools, and the eval battery

[agent-guide]: ../../../docs/guides/agent/gateway-deployment.md
<!-- docs@tether.io: agent-guide → guides/agent/gateway-deployment -->

[mount-the-plugin]: ../../../docs/guides/agent/gateway-deployment.md#mount-the-plugin
<!-- docs@tether.io: mount-the-plugin → guides/agent/gateway-deployment#mount-the-plugin -->
