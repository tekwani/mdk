# OperationsEfficiency

Operational efficiency reporting view with three tabs: site-level, miner-type-level, and individual miner-unit-level breakdown.

| Component | Description |
|---|---|
| `OperationsEfficiency` | Top-level tabbed view. |
| `EfficiencySiteView` | Site-level efficiency chart and table. |
| `EfficiencyMinerTypeView` | Per-miner-type breakdown. |
| `EfficiencyMinerUnitView` | Per-unit breakdown. |

## OperationsEfficiency Props

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `defaultTab` | Optional | `EfficiencyTabValue` | `'site-view'` | Initially selected tab |
| `siteView` | Optional | `EfficiencySiteViewProps` | — | Props forwarded to `EfficiencySiteView` |
| `minerTypeView` | Optional | `EfficiencyMinerTypeViewProps` | — | Props forwarded to `EfficiencyMinerTypeView` |
| `minerUnitView` | Optional | `EfficiencyMinerUnitViewProps` | — | Props forwarded to `EfficiencyMinerUnitView` |

## Minimal example

```tsx
import { OperationsEfficiency } from "@tetherto/mdk-react-devkit";

<OperationsEfficiency />
```
