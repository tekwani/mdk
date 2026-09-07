# Supported hardware

The hardware catalogue is generated from two sources: every `backend/workers/**/mdk-contract.json` (MDK-maintained Workers), plus every entry in [`backend/workers/external-workers.json`](../../../../../backend/workers/external-workers.json), fetched live from each manufacturer's own repository (manufacturer-maintained Workers). Both are validated against the vendored schema, which implements the `check:integrations-fresh` direction in [`../../ia.md`](../../ia.md#qa-gates).

- User-facing entrypoint: [`reference/supported-hardware.md`](../../../supported-hardware.md)
- Generated full catalogue (co-located with the workers): [`backend/workers/docs/supported-hardware.md`](../../../../../backend/workers/docs/supported-hardware.md)
- Generator: [`backend/workers/scripts/generate-catalogue.js`](../../../../../backend/workers/scripts/generate-catalogue.js)

Detailed facts for a MDK-maintained integration live next to its Worker package, at `backend/workers/<family>/<vendor>/`: `mdk-contract.json` for the runtime contract, and `USAGE.md` + `examples/` for prose and runnables. A manufacturer-maintained Worker keeps that detail in its own repository instead, linked directly from its row in the generated catalogue; the [Whatsminer run guide](../../../../guides/miners/run-whatsminer-worker.md) documents the general pattern for hosting a manufacturer-maintained Worker, independent of which families currently have one.

Which families currently have a manufacturer-maintained entry is generated data, not maintained here: see the catalogue linked above rather than this page for current coverage.

Pool integrations and external services live at [`../pools.md`](../pools.md) and [`../external-services.md`](../external-services.md).

## How the Workers catalogue stays correct

The catalogue is regenerated from the contracts, not hand-maintained:

```bash
cd backend/workers
npm run generate:catalogue
```

That rewrites the catalogue and touches nothing else. Maintainers rebuilding every generated page at once, before a release, use `npm run regenerate-docs`
from the repo root.

The generator ([`backend/workers/scripts/generate-catalogue.js`](../../../../../backend/workers/scripts/generate-catalogue.js)) validates every contract against the vendored [`mdk-contract.schema.json`](../../../../../backend/core/mdk-worker/mdk-contract.schema.json) and reports any non-conformance for maintainers to resolve. Mock types, ports, and manager-class names are not part of the contract — those live in each Worker's `USAGE.md` and the [workers manifest](../../../../../backend/workers/docs/workers-manifest.yaml).
