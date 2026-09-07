# HeaderControlsSettings

Settings panel for configuring the global application header, including which controls are visible, sticky behaviour, and theme defaults.

## Props

| Prop          | Status   | Type                   | Default | Description                             |
| ------------- | -------- | ---------------------- | ------- | --------------------------------------- |
| `preferences` | Required | `HeaderPreferences`    | —       | Current header preference values        |
| `onToggle`    | Required | `(key, value) => void` | —       | Called when a preference toggle changes |
| `onReset`     | Required | `VoidFunction`         | —       | Reset all preferences to defaults       |
| `isLoading`   | Optional | `boolean`              | `false` | Show loading state                      |
| `className`   | Optional | `string`               | —       | Additional CSS class                    |

## Minimal example

```tsx
import { HeaderControlsSettings } from "@tetherto/mdk-react-devkit";

<HeaderControlsSettings
  preferences={{ sticky: true, showTimezone: true }}
  onToggle={(key, value) => updatePref(key, value)}
  onReset={resetPrefs}
/>
```
