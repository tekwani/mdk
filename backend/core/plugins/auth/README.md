# @tetherto/mdk-plugin-auth

Gateway plugin exposing auth and identity APIs over the [Kernel](../../kernel/README.md) network: user info, token
refresh, permission lookups, and proxied external-data reads.

> [!IMPORTANT]
> This plugin is unwired and shipped for reference only. The Gateway does not register it or provide the `authLib`
> and `dataProxy` its controllers expect, so `/auth/token`, `/auth/permissions`, and `/auth/ext-data` are not
> functional as bundled. Bring your own identity layer.

> [!WARNING]
> Users will be required to bring their own plugin; the default plugins will be deprecated.

## Errors

The plugin raises:

| Code                     | Fires when                                       | Fix                  |
| ------------------------ | ------------------------------------------------ | -------------------- |
| `ERR_QUERY_INVALID_JSON` | The `/auth/ext-data` route's `query` parameter is not valid JSON | Pass `query` as a URL-encoded JSON string, or omit it |
