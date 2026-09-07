# ChartWrapper

Wrapper that handles three states for a chart's content area:

- **Loading** — shows a `Loader` skeleton (or custom node).
- **No data** — shows an `EmptyState` placeholder.
- **Has data** — shows the chart `children`.

## Props

| Prop                    | Status   | Type                                   | Default      | Description                      |
| ----------------------- | -------- | -------------------------------------- | ------------ | -------------------------------- |
| `children`              | Optional | `ReactNode`                            | —            | Chart content                    |
| `data`                  | Optional | `Record<string, unknown> \| unknown[]` | —            | Line-chart data (datasets list)  |
| `dataset`               | Optional | `Record<string, unknown> \| unknown[]` | —            | Bar-chart dataset                |
| `isLoading`             | Optional | `boolean`                              | `false`      | Show loader                      |
| `customLoader`          | Optional | `ReactNode`                            | `<Loader />` | Replace the default loader       |
| `showNoDataPlaceholder` | Optional | `boolean`                              | `true`       | Toggle empty placeholder         |
| `customNoDataMessage`   | Optional | `string \| ReactNode`                  | —            | Custom empty content             |
| `minHeight`             | Optional | `number`                               | `400`        | Min height (px)                  |
| `loadingMinHeight`      | Optional | `number`                               | `minHeight`  | Min height for the loading state |
| `className`             | Optional | `string`                               | —            | Additional class names           |

## Example

See [`chart-wrapper.example.tsx`](./chart-wrapper.example.tsx) for a runnable example.
