# @tetherto/mdk-plugin-telemetry

Gateway plugin exposing site-level telemetry APIs through [`@tetherto/mdk-client`](../../client/README.md):
hashrate, power consumption, efficiency, miner status, power mode, temperature, and per-container metrics.

> [!WARNING]
> Users will be required to bring their own plugin; the default plugins will be deprecated.

## Errors

| Code                        | Fires when                                                            | Fix                                    |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| `ERR_INVALID_DATE_RANGE`    | A history route's `start` query parameter is at or after `end`        | Pass a `start` earlier than `end`      |
| `ERR_MISSING_CONTAINER_ID`  | A container route is called without an `id` path parameter            | Include the container `id` in the path |
| `ERR_MISSING_START_END` | A metrics history route's `start` or `end` query parameter is missing or not a number | Pass numeric `start` and `end` query parameters |
| `ERR_SITE_DATA_UNSUPPORTED` | The site-data helper is asked for an RPC method it does not implement | Request a method the helper supports   |
