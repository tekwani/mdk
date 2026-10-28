Do not document

- Support for app route tables setting `autoGenerateMcp: true` has been removed, so do not document it.
MCP is a separate process, away from the Gateway, so no MCP-related config belongs in the Gateway.

- Do not expose `createRawMdkClient` it is not an option for "When to use which client path". While `createWorkerClient` wraps createRawMdkClient, it's not user facing.
