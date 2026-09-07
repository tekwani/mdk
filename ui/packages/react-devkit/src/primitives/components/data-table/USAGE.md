# DataTable

Sortable, paginated, optionally selectable / expandable table built on
TanStack React Table. Controlled and uncontrolled modes for each piece of
state.

## Props (subset)

| Prop                      | Status   | Type                                      | Default | Description                             |
| ------------------------- | -------- | ----------------------------------------- | ------- | --------------------------------------- |
| `data`                    | Required | `I[]`                                     | —       | Rows                                    |
| `columns`                 | Required | `DataTableColumnDef<I>[]`                 | —       | TanStack column defs                    |
| `fullWidth`               | Optional | `boolean`                                 | `true`  | Stretch to container width              |
| `enableRowSelection`      | Optional | `boolean \| ((row) => boolean)`           | `false` | Checkbox column                         |
| `enableMultiRowSelection` | Optional | `boolean`                                 | `true`  | Allow multi-select                      |
| `selections`              | Optional | `DataTableRowSelectionState`              | —       | Controlled row-selection state          |
| `onSelectionsChange`      | Optional | `(s: DataTableRowSelectionState) => void` | —       | Setter                                  |
| `enablePagination`        | Optional | `boolean`                                 | `true`  | Show pagination footer                  |
| `pagination`              | Optional | `DataTablePaginationState`                | —       | Controlled pagination                   |
| `sorting`                 | Optional | `DataTableSortingState`                   | —       | Controlled sorting                      |
| `bordered`                | Optional | `boolean`                                 | `false` | Add cell borders                        |
| `loading`                 | Optional | `boolean`                                 | `false` | Show loading overlay                    |
| `enableRowExpansion`      | Optional | `boolean`                                 | `false` | Show row expansion column               |
| `renderExpandedContent`   | Optional | `(row) => ReactNode`                      | —       | Required when row expansion is enabled  |
| `getRowId`                | Optional | `(row, index, parent?) => string`         | index   | Stable row ID source                    |
| `onRowClick`              | Optional | `(rowData: I) => void`                    | —       | Makes rows interactive (see note below) |

See [`data-table.tsx`](./data-table.tsx) for the full list (16 props).

> [!NOTE]
> Setting `onRowClick` makes every body row `role="button"`, focusable, and keyboard-activatable
> (Enter/Space). Clicks starting inside a `button`, `a`, `input`, `label`, `[role="checkbox"]`, or
> anything marked `data-no-row-click` are ignored, so the selection checkbox and expand toggle keep
> working independently of the row click.

### Column `meta`

| Field   | Applied by `DataTable` | Description                            |
| ------- | ---------------------- | -------------------------------------- |
| `align` | Yes                    | `left` \| `center` \| `right` on cells |

## Example

```tsx
<DataTable<Miner>
  data={data}
  columns={columns}
  getRowId={(row) => row.id}
  enablePagination
/>
```

## Data contracts

`DataTableColumnDef`, `DataTableRow`, `DataTableSortingState`,
`DataTablePaginationState`, `DataTableRowSelectionState`, `DataTableExpandedState`
are re-exported from `@tetherto/mdk-react-devkit`.
