# SettingsDashboard

Top-level settings page that composes all per-section settings cards (header controls, RBAC, import/export, feature flags) in a single grid layout.

## Props

| Prop                  | Status   | Type                          | Default | Description                                 |
| --------------------- | -------- | ----------------------------- | ------- | ------------------------------------------- |
| `dangerActions`       | Optional | `ActionButtonProps[]`         | —       | Danger-zone action buttons (reset, delete)  |
| `headerControlsProps` | Optional | `HeaderControlsSettingsProps` | —       | Props forwarded to `HeaderControlsSettings` |
| `rbacControlProps`    | Optional | `RBACControlSettingsProps`    | —       | Props forwarded to `RBACControlSettings`    |
| `importExportProps`   | Optional | `ImportExportSettingsProps`   | —       | Props forwarded to `ImportExportSettings`   |
| `featureFlagsProps`   | Optional | `FeatureFlagsSettingsProps`   | —       | Props forwarded to `FeatureFlagsSettings`   |
| `showFeatureFlags`    | Optional | `boolean`                     | `false` | Whether to show the feature-flags section   |
| `className`           | Optional | `string`                      | —       | Additional CSS class                        |

## Minimal example

```tsx
import { SettingsDashboard } from "@tetherto/mdk-react-devkit";

<SettingsDashboard
  rbacControlProps={rbacProps}
  importExportProps={importExportProps}
/>
```
