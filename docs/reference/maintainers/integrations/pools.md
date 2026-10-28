<!-- mdk-monorepo: hand-maintained until check:integrations-fresh lands; see ../ia.md#qa-gates -->

# Pool integrations

Workers with `metadata.deviceFamily: "minerpool"` in their `mdk-contract.json`. Protocol adapters, not hardware: each contract defines telemetry (`hashrate`, `balance`, `workers_online`, …) and commands for the pool's API.

The list is generated, not kept here. The mining-pool rows of the [Supported Workers catalogue](../../../../backend/workers/docs/supported-workers.md)
cover both the partner-maintained pools registered in [`external-workers.json`](../../../../backend/workers/external-workers.json) and the pools
maintained in `backend/workers/minerpools/`.
