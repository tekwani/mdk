# Hash balance (financial reporting)

Composite financial view for site hash revenue, network hashrate, hashprice, and hash cost. Use `HashBalance` for the full page (tabs + timeframe controls), or compose `HashBalanceRevenuePanel` / `HashBalanceCostPanel` with your own chrome.

## HashBalance

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `HashRevenueResponse \| null` | — | Revenue / cost log and summary |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
| `isError` | Optional | `boolean` | `false` | Show error state |
| `errorMessage` | Optional | `string` | `'Error loading hash balance data. Please try again later.'` | Error copy when `isError` |
| `initialDateRange` | Optional | `FinancialDateRange` | year-to-date | Initial period |
| `onDateRangeChange` | Optional | `(range, query) => void` | — | Fired when the user changes the period |
| `className` | Optional | `string` | — | Root layout class |
| `tabsClassName` | Optional | `string` | — | Tabs wrapper class |
| `tabsListClassName` | Optional | `string` | — | Tab list class |

```tsx
import { HashBalance } from "@tetherto/mdk-react-devkit";

<HashBalance data={response} isLoading={false} />
```

## HashBalanceRevenuePanel

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `HashRevenueResponse \| null` | — | Same payload as `HashBalance` |
| `log` | Optional | `HashRevenueLogEntry[]` | — | Optional log override |
| `dateRange` | Required | `FinancialDateRange` | — | Active reporting window |
| `currency` | Required | `HashBalanceCurrency` | — | `USD` or `BTC` label for per-PH/day units |
| `onCurrencyChange` | Required | `(currency) => void` | — | Currency toggle handler |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `timeframeType` | Optional | `TimeframeTypeValue \| null` | `null` | Year / month / week mode |

## HashBalanceCostPanel

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | Optional | `HashRevenueResponse \| null` | — | Same payload as `HashBalance` |
| `log` | Optional | `HashRevenueLogEntry[]` | — | Optional log override |
| `dateRange` | Required | `FinancialDateRange` | — | Active reporting window |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `timeframeType` | Optional | `TimeframeTypeValue \| null` | `null` | Year / month / week mode |
