# Kernel access an app declares

`permissions` in `mdk-app.yaml` is a list of rules over the Kernel's resources. Each rule names resources, the verbs
it covers on them, and optionally `resourceNames` patterns that narrow it to some instances. On 0.12 the Kernel
admits the app's own key with full access and does not enforce these rules: they are the app's declared contract,
read by the operator at install and review time, and the shape the Kernel enforces as a role from the next minor.
Declare exactly what the code uses, so the upgrade changes nothing.

## Resources and verbs

| Resource  | Verbs                    | Instance name a rule's `resourceNames` matches                   |
| --------- | ------------------------ | ---------------------------------------------------------------- |
| `devices` | `read`, `write`          | `family/brand/worker/device`, e.g. `miner/antminer/antminer-a/AM-001` |
| `workers` | `list`, `delete`         | `family/brand/worker` (`list` has no instance)                   |
| `actions` | `read`, `write`, `vote`  | none                                                             |

Scope only `devices` and `workers`. Patterns are glob-like over the `/`-separated name: `*` matches everything,
`miner/*` every miner, `miner/antminer/*` every Antminer, `powermeter/*` every power meter (the family identifier
is `powermeter`).

## Client method to rule

Every call an app makes through its Kernel client (`config.mdkClient`) sends one action. The script
[`derive-permissions.mjs`](../scripts/derive-permissions.mjs) carries this table and finds the calls.

| Client method            | Kernel action           | Declares             | Instance                               |
| ------------------------ | ----------------------- | -------------------- | -------------------------------------- |
| `listWorkers()`          | `worker.list`           | `workers: list`      | none                                   |
| `terminateWorker(id)`    | `worker.terminate`      | `workers: delete`    | the Worker                             |
| `getCapabilities(id)`    | `device.capabilities`   | `devices: read`      | the device                             |
| `pullTelemetry(id, q)`   | `telemetry.pull`        | `devices: read`      | the device                             |
| `pullState(id)`          | `state.pull`            | `devices: read`      | the device                             |
| `getCommandStatus(cid)`  | `command.status`        | `devices: read`      | the command's target device(s)         |
| `sendCommand(id, c, p)`  | `command.request`       | `devices: write`     | the device, or every device of a worker-scoped command |
| `getAction`, `getActionsBatch`, `queryActions` | `action.get`, `action.get-batch`, `action.query` | `actions: read` | none |
| `pushAction`, `pushActionsBatch`, `cancelActionsBatch` | `action.push`, `action.push-batch`, `action.cancel-batch` | `actions: write` | none |
| `voteAction`             | `action.vote`           | `actions: vote`      | none                                   |

Helpers that first ask the Kernel for the fleet declare `workers: list` as well: `getStatus`, `waitForWorkers`,
`waitForDevice`, `getWorkerKey`. `sendWorkerCommand` and `pullWorkerTelemetry` then dial the Worker directly, which
no app permission describes; the Worker's own allow-list decides.

## Who may call the app

`permissions` says nothing about callers. On 0.12 a route marked `"auth": true` in `plugin/mdk-plugin.json` is
checked by the Gateway's `authVerifier` before anything else, and a route without it is open to any caller that
passes the Host check. The [Gateway README](../../../../../../backend/core/gateway/README.md) describes both.
