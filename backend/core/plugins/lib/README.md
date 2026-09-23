# Site plugin helpers

Shared helpers for the built-in site plugins in this directory ([`telemetry`](../telemetry/README.md),
[`site-hashrate`](../site-hashrate/README.md), [`site-monitor`](../site-monitor/README.md)): start/end and
date-range validation, period math, metric constants, and JSON query-param parsing.

> [!WARNING]
> Users will be required to bring their own plugin; the default plugins will be deprecated.

## Errors

| Code                     | Fires when                                              | Fix                               |
| ------------------------ | ------------------------------------------------------- | --------------------------------- |
| `ERR_INVALID_DATE_RANGE` | `validateStartEnd` receives a `start` at or after `end` | Pass a `start` earlier than `end` |
| `ERR_INVALID_JSON`  | `parseJsonQueryParam` cannot parse a query parameter as JSON and the caller did not override the error code | Pass valid JSON, or supply a custom `errorCode` argument |
| `ERR_MISSING_START_END` | `validateStartEnd` receives a `start` or `end` that is missing or not a number | Pass numeric `start` and `end` query parameters |
