# @tetherto/mdk-plugin-site-hashrate

Example Gateway plugin that aggregates hashrate history across every registered Worker through
[`@tetherto/mdk-client`](../../client/README.md).

> [!WARNING]
> Users will be required to bring their own plugin; the default plugins will be deprecated.

## Errors

| Code                     | Fires when                                       | Fix                               |
| ------------------------ | ------------------------------------------------ | --------------------------------- |
| `ERR_INVALID_DATE_RANGE` | The `start` query parameter is at or after `end` | Pass a `start` earlier than `end` |
