# AddSparePartModal

Modal for registering a new spare part. Presents a part-type tab strip (Controller, PSU,
Hashboard, …) and a form for miner model, part model, serial number, MAC address, status,
location, tags, and a comment. Validation is controller-aware — the MAC address field appears and
is required only when a controller part type is selected; other part types require a serial number.

## When to use

Use this in an inventory "Spare Parts" view when an operator needs to register a single new part.
Pair it with `SparePartSubTypesModal` (via the `subTypes*` props) so the user can manage the
allowed part models without leaving the dialog.

## Props

| Prop                           | Status   | Type                                                                    | Default | Description                                                                              |
| ------------------------------ | -------- | ----------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `isOpen`                       | Required | `boolean`                                                               | —       | Whether the modal is open                                                                |
| `onClose`                      | Required | `() => void`                                                            | —       | Called when the modal requests to close                                                  |
| `partTypes`                    | Required | `{ value: string; label: string }[]`                                    | —       | Part-type tabs                                                                           |
| `modelOptions`                 | Required | `FormSelectOption[]`                                                    | —       | Part model options for the active part type                                              |
| `minerModelOptions`            | Required | `FormSelectOption[]`                                                    | —       | Parent miner model options                                                               |
| `statusOptions`                | Required | `FormSelectOption[]`                                                    | —       | Status options                                                                           |
| `locationOptions`              | Required | `FormSelectOption[]`                                                    | —       | Location options                                                                         |
| `onPartTypeChange`             | Required | `(partTypeId: string) => void`                                          | —       | Called when the active part type changes (refetch model options here)                    |
| `onSubmit`                     | Required | `(values: AddSparePartFormValues) => Promise<{ fieldErrors? } \| void>` | —       | Submit handler; return `fieldErrors` to surface server-side validation                   |
| `defaultPartTypeId`            | Optional | `string`                                                                | —       | Initially selected part type                                                             |
| `isModelOptionsLoading`        | Optional | `boolean`                                                               | —       | Disables the model select while options load                                             |
| `isControllerPartTypeSelected` | Optional | `boolean`                                                               | —       | When true, the MAC address field is shown and required                                   |
| `isLoading`                    | Optional | `boolean`                                                               | —       | Renders a loader instead of the form                                                     |
| `subTypesPartTypes`            | Optional | `SparePartSubTypesModalPartType[]`                                      | —       | Part types for the embedded "View Subtypes" modal                                        |
| `subTypesActivePartTypeId`     | Optional | `string`                                                                | —       | Active part type for the embedded subtypes modal                                         |
| `subTypes`                     | Optional | `string[]`                                                              | —       | Subtype names for the active part type in the embedded modal                             |
| `onSubTypesPartTypeChange`     | Optional | `(id: string) => void`                                                  | —       | Called when the active tab changes in the embedded subtypes modal                        |
| `onAddSubType`                 | Optional | `(name: string) => Promise<{ error?: string } \| void>`                 | —       | Add handler for the embedded subtypes modal; return `{ error }` to surface a field error |
| `isSubTypesLoading`            | Optional | `boolean`                                                               | —       | Loading state for the embedded subtypes modal                                            |

## Example

```tsx
import { AddSparePartModal } from '@tetherto/mdk-react-devkit/domain'

<AddSparePartModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  partTypes={partTypes}
  defaultPartTypeId={activePartType}
  modelOptions={modelOptions}
  minerModelOptions={minerModelOptions}
  statusOptions={statusOptions}
  locationOptions={locationOptions}
  isControllerPartTypeSelected={activePartType === 'controller'}
  onPartTypeChange={setActivePartType}
  onSubmit={async (values) => { await api.addSparePart(values) }}
/>
```

## Notes

- Select fields default to `""` (empty), which renders the placeholder. Switching part type clears
  the part model and any serial/MAC validation errors.
- MAC validation uses the format `00:1A:2B:3C:4D:5E` (case-insensitive, `:` or `-` separators)
