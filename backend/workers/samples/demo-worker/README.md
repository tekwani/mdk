# @tetherto/mdk-worker-demo

Third-party authoring demo: a plain Worker Plugin that integrates WM miners over a (hypothetical) firmware v3 HTTP
JSON API, with its own SQLite persistence and no MDK Worker-infra services. A caller hosts it on a
[`WorkerRuntime`](../../../core/mdk-worker/README.md) (see
[`examples/backend/demo-worker-caller`](../../../../examples/backend/demo-worker-caller)), not this package.

## Errors

| Code                     | Fires when                      | Fix                                  |
| ------------------------ | ------------------------------- | ------------------------------------ |
| `ERR_DEVICE_CALL_FAILED` | A device firmware HTTP call returns a non-OK status and the response body carries no `error` of its own | Confirm the device is reachable and its firmware API is responding; the HTTP status is appended to the message |
