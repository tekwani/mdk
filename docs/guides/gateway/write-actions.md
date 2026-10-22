---
title: Submit and approve write actions
description: Expose approval-gated write actions as Gateway routes, then submit, review, approve, reject, or cancel them from a React app.
docs@tether_slug: guides/gateway/write-actions
---

## Overview

This guide shows how to expose approval-gated write actions as Gateway routes, then submit, review, approve, reject, or cancel
them from a React app. MDK ships no React hooks for actions: the app calls its own routes with `useQuery` / `useMutation`.

## Prerequisites

- The [Gateway is running][run-gateway] with an [actions app mounted](#create-an-actions-app)
- Your actions routes are marked `"auth": true` and the Gateway runs with an `authVerifier`, since [an unprotected route is reachable by anyone][plugins-auth]
- Your controllers pass the caller's device-family write permissions (`miner:w`, `container:w`) to Kernel as `authPerms`, which Kernel requires before
resolving or approving a write
- If present, your React app is wrapped in [`<MdkProvider apiBaseUrl={...}>`][react-adapter-surface]

Create the [actions app](#create-an-actions-app) first, then [call its routes](#call-the-routes-from-a-react-app) from the UI.

## Create an actions app

To enable approval-gated writes, create an app that exposes HTTP routes for the write-action workflow. Each route should call the corresponding method on the app's own `mdkClient` (built from `require('@tetherto/mdk-gateway/plugin')`, [as any app does][plugins]).

> [!NOTE]
> The paths shown below (`/auth/actions*`) are illustrative examples. You may use any path structure that fits your app's routing pattern.

### Required routes

| Method | Example Path | `mdkClient` method | Purpose |
|--------|--------------|------------------|---------|
| `GET` | `/auth/actions` | `queryActions()` | Query actions by lifecycle state (voting/ready/executing/done) |
| `POST` | `/auth/actions/voting` | `pushAction()` | Submit a single action for approval |
| `POST` | `/auth/actions/voting/batch` | `pushActionsBatch()` | Submit multiple actions for approval |
| `PUT` | `/auth/actions/voting/:id/vote` | `voteAction()` | Cast approval/rejection vote on an action |
| `DELETE` | `/auth/actions/voting/cancel` | `cancelActionsBatch()` | Cancel pending actions by IDs |

### App structure

Start from `mdk create app actions` and replace its summary route with one controller per route:

```text
apps/actions/
├── mdk-app.yaml
└── plugin/
    ├── mdk-plugin.json
    ├── lib/client.js
    └── controllers/
        ├── query.js
        ├── push.js
        ├── push-batch.js
        ├── vote.js
        └── cancel.js
```

### Example controller (push.js)

```javascript
'use strict'

const mdkClient = require('../lib/client')

module.exports = async function pushAction (req) {
  // The identity your authVerifier returned for this request (route marked "auth": true)
  const { user: { userId: voter }, perms: authPerms } = req._info

  return await mdkClient.pushAction({
    query: req.body.query,       // Device query/selector
    action: req.body.action,     // Action name from worker contract
    params: req.body.params,     // Action parameters
    voter,                       // Current user identifier
    authPerms                    // User's permissions (e.g., ['miner:w'])
  })
}
```

[`lib/client.js`][plugins] builds the client once for the whole app, per the pattern in the app authoring guide.

### Manifest example (mdk-plugin.json)

```json
{
  "name": "actions",
  "version": "1.0.0",
  "description": "Approval-gated write action APIs",
  "routes": [
    {
      "id": "actions.push",
      "handler": "./controllers/push.js",
      "auth": true,
      "http": {
        "method": "POST",
        "path": "/auth/actions/voting",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["query", "action", "params"],
                "properties": {
                  "query": { "type": "object" },
                  "action": { "type": "string" },
                  "params": { "type": "array" }
                }
              }
            }
          }
        }
      },
      "description": "Submit a write action for approval",
      "safety": "Stage-only: does not execute until approved"
    }
  ]
}
```

> [!WARNING]
> `"auth": true` makes the Gateway answer `401` unless the `authVerifier` vouches for the caller, which matters more here than on a read route
> because it stages fleet-changing writes. The controller still checks that the identity in `req._info` holds the write permission.
> [Auth and permissions][plugins-auth] covers the patterns.

### Mount the app

Declare it in `mdk.yaml` and start the stack with `mdk run`. The React hooks call `/auth/actions*` at the Gateway root, so mount
the app at `/` rather than the default `/apps/<name>`:

```yaml
spec:
  apps:
    - name: actions
      package: actions
      mount: /
```

Running it from your own code instead goes through `startGateway({ apps })` and `createAppRuntime()`, as
[starting apps from code][plugins-from-code] shows.

> [!WARNING]
> The Kernel does not enforce the `permissions` an app declares in `mdk-app.yaml` yet: the app runtime's Kernel key is admitted
> with full access. The controller's own check on `req._info` is what stands between a caller and a staged write.

## Call the routes from a React app

Read the queue with `useQuery` and send writes with `useMutation`, both re-exported by
[`@tetherto/mdk-react-adapter`][react-adapter]. Invalidate the queue after each write so the list refreshes:

```tsx
import { useMdkContext, useMutation, useQuery, useQueryClient } from "@tetherto/mdk-react-adapter";

const QUEUE_KEY = ["actions", "voting"];

function PendingActions() {
  const { apiBaseUrl } = useMdkContext();
  const queryClient = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: QUEUE_KEY,
    // Your GET route decides how it maps the request onto `queryActions()` and what it returns;
    // this example assumes it returns the voting actions as an array.
    queryFn: () => fetch(`${apiBaseUrl}/auth/actions`).then((r) => r.json()),
    refetchInterval: 10_000,
  });

  const vote = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      fetch(`${apiBaseUrl}/auth/actions/voting/${id}/vote`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUEUE_KEY }),
  });

  return pending.map((action: { id: string }) => (
    <button key={action.id} type="button" onClick={() => vote.mutate({ id: action.id, approve: true })}>
      Approve {action.id}
    </button>
  ));
}
```

Submit (`POST /auth/actions/voting`) and cancel (`DELETE /auth/actions/voting/cancel`) follow the same `useMutation` shape.
Approved actions become command requests once the vote thresholds are met; the item then leaves the voting queue.

For complete mdk-client method signatures and protocol details, see the [mdk-client README][client-readme] and [Kernel actions integration tests][actions-test].

## Next steps

- Understand the [approval-gated write architecture][approval-gated-writes] — including how approved actions become normal command requests
- Protect your routes with [controller-level auth and permission checks][plugins-auth]
- Build routes with the [app route table format][plugins], including caching and manifest fields
- Run integration coverage: [`backend/core/kernel/tests/integration/actions.test.js`][actions-test]

## Links

[approval-gated-writes]: ../../concepts/control-plane.md#approval-gated-writes
<!-- docs@tether.io: approval-gated-writes → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actionmanager -->

[plugins-auth]: plugins.md#auth-and-permissions
<!-- docs@tether.io: plugins-auth → guides/gateway/plugins#auth-and-permissions -->

[plugins]: plugins.md
<!-- docs@tether.io: plugins → guides/gateway/plugins -->

[plugins-from-code]: plugins.md#start-apps-from-code
<!-- docs@tether.io: plugins-from-code → guides/gateway/plugins#start-apps-from-code -->

[run-gateway]: run.md
<!-- docs@tether.io: run-gateway → guides/gateway/run -->

[client-readme]: ../../../backend/core/client/README.md
<!-- docs@tether.io: client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[actions-test]: ../../../backend/core/kernel/tests/integration/actions.test.js
<!-- docs@tether.io: actions-test → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/tests/integration/actions.test.js -->

[react-adapter]: ../../../ui/packages/react-adapter/README.md
<!-- docs@tether.io: react-adapter → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md -->

[react-adapter-surface]: ../../../ui/packages/react-adapter/README.md#surface
<!-- docs@tether.io: react-adapter-surface → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md#surface -->

