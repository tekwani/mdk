---
title: Operator agent how-to guides
description: Task guides for running MDK's conversational operator agent, standalone or behind the Gateway.
docs@tether_slug: guides/agent
---

## Overview

`@tetherto/mdk-agent` is a conversational operator agent that answers plain-language questions about a mining fleet, calls
fleet tools over MCP, and gates writes behind human approval. [What the agent is and how it fits the stack][agent-concept]
covers the concepts; these guides cover running it.

The agent never rides on another stack's own Gateway. A model (`:11500`), an MCP tool server (`:3008` in the
[full-site example][full-site-example]), and the agent's own Gateway (`:3847`) are three separate processes

> [!NOTE]
> Full-site's own Gateway (`:3007`) has no `/agent` routes at all.

```text
  model  ──►  agent gateway  ──►  MCP tool server  ──►  kernel + workers
   :11500        :3847              :3008                  (the fleet)
                   ▲
                   └── UI shell :3030, proxying /agent
```

The agent connects to MCP once, when a session is created (the first `POST /agent/sessions`), so a session started before
the tool server is up gets no tools and answers from the model alone, with no error to tell you.

## Choose a guide

| Goal | Guide |
| --- | --- |
| Run the agent as a standalone CLI, for local development or evaluation | [Run the agent as a standalone CLI][run-standalone] |
| Deploy the agent behind the Gateway as a chat API for an operator UI | [Deploy the agent behind the Gateway][gateway-deployment] |
| Score a battery run against a fleet and compare models | [Evaluate the agent][agent-evaluation] |

Exposing a plugin's own routes to the agent as tools is a detail of [building Gateway plugins][gateway-plugins], not its own
deployment path. See [Expose data to the agent][expose-data] there.

## Next steps

- If Gateway, Kernel, or plugin are unfamiliar, see the [terminology][terminology]
- [Understand the agent as a stack component][agent-concept]
- [Understand the Gateway as a development surface][gateway-concept]

## Links

[agent-concept]: ../../../backend/core/agent/README.md
<!-- docs@tether.io: agent-concept → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[run-standalone]: run-standalone.md
<!-- docs@tether.io: run-standalone → guides/agent/run-standalone -->

[gateway-deployment]: gateway-deployment.md
<!-- docs@tether.io: gateway-deployment → guides/agent/gateway-deployment -->

[expose-data]: expose-data.md
<!-- docs@tether.io: expose-data → guides/agent/expose-data -->

[gateway-plugins]: ../gateway/plugins.md
<!-- docs@tether.io: gateway-plugins → guides/gateway/plugins -->

[full-site-example]: ../../../examples/full-site/README.md
<!-- docs@tether.io: full-site-example → https://github.com/tetherto/mdk/blob/main/examples/full-site/README.md -->

[agent-evaluation]: ../../../backend/core/agent/docs/EVALUATION.md
<!-- docs@tether.io: agent-evaluation → https://github.com/tetherto/mdk/blob/main/backend/core/agent/docs/EVALUATION.md -->

[gateway-concept]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-concept → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->
