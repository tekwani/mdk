# @tetherto/mdk-app-demo

MDK app that aggregates live telemetry, and history where a Worker keeps it, from every registered miner that reports `hashrate_rt` via
[`@tetherto/mdk-client`](../../core/client/README.md) — a fleet summary and a history read, both read-only. Any Worker
scaffolded with `mdk create worker` qualifies. It runs in its own
process under [`@tetherto/mdk-app-runtime`](../../core/app-runtime/README.md), and the Gateway forwards its routes to it.

## Run it

Declare it under `spec.apps` in `mdk.yaml` and start the stack with `mdk run`:

```yaml
spec:
  apps:
    - name: demo
      package: "@tetherto/mdk-app-demo"
```

The Gateway serves an app's routes under `/apps/<name>` unless `mount` is set, so this entry serves
`GET /apps/demo/api/demo/summary`. Add `mount: /` to serve the paths in [Routes](#routes) at the Gateway root.

## Device matching

A device counts when its `getCapabilities` telemetry list carries `hashrate_rt` in `TH/s`, or with no unit declared
([`lib/devices.js`](lib/devices.js)). That is the shape `mdk create worker` scaffolds
([`packages/cli/templates/worker`](../../../packages/cli/templates/worker/README.md): `hashrate_rt`, `power`,
`temperature`, `power_mode`). A `hashrate_rt` in another unit is skipped so the TH/s totals stay correct. Kernel
capability responses carry no brand/provider field, so the telemetry list is what the app matches on. A Worker in state
`TERMINATED`, or with `healthState: 'DEAD'`, is skipped.

A `history` channel is optional. `demo.history` lists every matched device, but pulls only the ones that declare it;
the rest come back with `hasHistory: false` and no samples.

## Routes

| Route          | Method + path           | Notes                                                  |
| -------------- | ----------------------- | ------------------------------------------------------ |
| `demo.summary` | `GET /api/demo/summary` | Fleet totals (`hashrateThs`, `powerW`, `avgTemperatureC`) plus a per-device breakdown |
| `demo.history` | `GET /api/demo/history` | Recent `history` telemetry samples for devices that declare the channel (`hasHistory`); `limit` (default `10`, capped at `500`) and optional `deviceId` narrow the read |

`demo.summary` sums `hashrate_rt` and `power` across every matched device and averages `temperature` over the devices
that report one; `power_mode` stays per-device. `demo.history` returns whatever each Worker's `history` handler returns,
and 404s with `ERR_UNKNOWN_DEVICE_ID` when a `deviceId` filter matches nothing.

## Errors

| Code                         | Fires when                              | Fix                      |
| ---------------------------- | --------------------------------------- | ------------------------ |
| `ERR_MDK_CLIENT_UNAVAILABLE` | Thrown by [`@tetherto/mdk-client`](../../core/client/README.md) when it has no connected Kernel | Not exposed to the caller — both routes catch it and answer `200` with `kernelConnected: false`. `demo.summary` also zeroes its `totals`; `demo.history` has no `totals` field to zero. Both answer an empty `devices`. |
| `ERR_UNKNOWN_DEVICE_ID`      | `demo.history`'s optional `deviceId` query param doesn't match any matched device (`404`) | Pass a `deviceId` that matches a registered miner, or omit it |

[`tests/plugin.test.js`](tests/plugin.test.js) is the executable spec for both routes, including the
Kernel-unavailable and unknown-device paths above.

## Next steps

- [Understand the underlying client](../../core/client/README.md): how `createMdkClient` reaches a Kernel
- [Build a Worker](../../../docs/guides/workers/build-a-worker.md): what a device needs to expose to be aggregated by an app like this one
