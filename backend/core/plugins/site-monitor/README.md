# @tetherto/mdk-plugin-site-monitor

Built-in Gateway plugin exposing site identity, feature configuration, and live per-device hashrate through
[`@tetherto/mdk-client`](../../client/README.md).

> [!WARNING]
> Users will be required to bring their own plugin; the default plugins will be deprecated.

## Errors

| Code                              | Fires when                                                            | Fix                                                 |
| --------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| `ERR_KERNEL_CLIENT_NOT_CONNECTED` | A route reads through the MDK client while it has no connected Kernel | Confirm Kernel is running and reachable, then retry |
