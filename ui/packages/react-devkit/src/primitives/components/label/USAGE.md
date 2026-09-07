# Label

Accessible `<label>` element for form fields. Built on Radix UI Label so that
clicks anywhere on the label focus the associated input.

## Props

| Prop        | Status   | Type        | Default | Description                    |
| ----------- | -------- | ----------- | ------- | ------------------------------ |
| `htmlFor`   | Optional | `string`    | —       | Id of the input being labelled |
| `className` | Optional | `string`    | —       | Additional class names         |
| `children`  | Optional | `ReactNode` | —       | Label content                  |

All other native `<label>` attributes are forwarded.

## Example

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

## Notes

- Pair with `Input`, `Select`, `Checkbox`, `Switch`, etc. via `htmlFor`
- Inside an MDK `<Form>` use `<FormLabel>` instead — it auto-links to the field
