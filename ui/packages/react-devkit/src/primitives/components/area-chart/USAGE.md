# AreaChart

Presentational Chart.js area chart (`Line` with fill). Data must be provided
via props — no data fetching.

## Props

| Prop        | Status   | Type                         | Default | Description                       |
| ----------- | -------- | ---------------------------- | ------- | --------------------------------- |
| `data`      | Required | `ChartJS<"line">["data"]`    | —       | Chart.js data object              |
| `options`   | Optional | `ChartJS<"line">["options"]` | —       | Merged with defaults              |
| `tooltip`   | Optional | `ChartTooltipConfig`         | —       | Custom HTML tooltip configuration |
| `height`    | Optional | `number`                     | `300`   | Pixel height                      |
| `className` | Optional | `string`                     | —       | Additional class names            |

## Example

```tsx
<AreaChart data={areaData} options={options} height={300} />
```
