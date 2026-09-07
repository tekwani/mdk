# @tetherto/mdk-plugin-demo

Gateway plugin that aggregates live telemetry and SQLite history from every registered
[`@tetherto/mdk-worker-demo`](../../workers/samples/demo-worker) device via
[`@tetherto/mdk-client`](../../core/client/README.md) — a fleet summary and a history read, both read-only.

## Device matching

A device counts as a demo device when its `getCapabilities` telemetry list carries both `hashrate_rt` and `history`
([`lib/devices.js`](lib/devices.js)) — the `history` channel is what separates this Worker from other
`hashrate_rt` miners, since Kernel capability responses carry no brand/provider field to match on instead. A Worker in
state `TERMINATED`, or with `healthState: 'DEAD'`, is skipped.

## Routes

| Route | Method + path | Notes |
| --- | --- | --- |
| `demo.summary` | `GET /api/demo/summary` | Fleet totals (`hashrateThs`, `powerW`, `avgTemperatureC`) plus a per-device breakdown |
| `demo.history` | `GET /api/demo/history` | Recent `history` telemetry samples; `limit` (default `10`, capped at `500`) and optional `deviceId` narrow the read |

`demo.summary` sums `hashrate_rt` and `power` across every matched device and averages `temperature`; `power_mode`
stays per-device. `demo.history` reads the Worker's own SQLite store rather than contacting the device, and 404s with
`ERR_UNKNOWN_DEVICE_ID` when a `deviceId` filter matches nothing.

## Errors

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_MDK_CLIENT_UNAVAILABLE` | Thrown by [`@tetherto/mdk-client`](../../core/client/README.md) when it has no connected Kernel | Not exposed to the caller — both routes catch it and answer `200` with `kernelConnected: false`. `demo.summary` also zeroes its `totals`; `demo.history` has no `totals` field to zero. Both answer an empty `devices`. |
| `ERR_UNKNOWN_DEVICE_ID` | `demo.history`'s optional `deviceId` query param doesn't match any registered demo device (`404`) | Pass a `deviceId` that matches a registered demo device, or omit it |

[`tests/plugin.test.js`](tests/plugin.test.js) is the executable spec for both routes, including the
Kernel-unavailable and unknown-device paths above.

## Next steps

- [Understand the underlying client](../../core/client/README.md): how `createMdkClient` reaches a Kernel
- [Build a Worker](../../../docs/guides/workers/build-a-worker.md): what a device needs to expose to be aggregated by a plugin like this one
