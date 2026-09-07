# TagInput

An input that stores typed or selected values as removable tag chips, with an optional dropdown, keyboard navigation, and a `renderDropdown` escape hatch for fully custom dropdown content.

## Props

| Prop                | Status   | Type                         | Default | Description                                             |
| ------------------- | -------- | ---------------------------- | ------- | ------------------------------------------------------- |
| `value`             | Optional | `string[]`                   | `[]`    | Controlled list of tag values                           |
| `onTagsChange`      | Optional | `(tags: string[]) => void`   | —       | Fired when tags are added or removed                    |
| `onInputChange`     | Optional | `(value: string) => void`    | —     | Fired on every keystroke; useful for async option loading |
| `onSubmit`          | Optional | `(tags: string[]) => void`   | —       | Fired when the user presses Enter                       |
| `options`           | Optional | `TagInputOption[]`           | `[]` | Dropdown options (string or `{ value, label, disabled? }`) |
| `placeholder`       | Optional | `string`                     | `'Search...'` | Input placeholder when no tags are selected       |
| `size`              | Optional | `'sm' \| 'md' \| 'lg'`       | `'lg'`  | Controls input height                                   |
| `disabled`          | Optional | `boolean`                    | `false` | Disables the input                                      |
| `allowCustomTags`   | Optional | `boolean`                    | `true`  | Allows adding arbitrary typed text as a tag via Enter   |
| `filterOptions`     | Optional | `(options: TagInputOption[], query: string) => TagInputOption[]` | case-insensitive includes | Custom option filter function |
| `variant`           | Optional | `'default' \| 'search'`      | `'search'` | `'search'` shows a magnifying-glass icon (doubles as a clear-all button) |
| `label`             | Optional | `string`                     | —       | Label rendered above the input                          |
| `id`                | Optional | `string`                     | auto-generated | HTML id for the input element                    |
| `className`         | Optional | `string`                     | —       | Additional class for the inner `<input>`                |
| `wrapperClassName`  | Optional | `string`                     | —       | Additional class for the root wrapper                   |
| `dropdownMinHeight` | Optional | `string`                     | —       | CSS min-height for the dropdown panel                   |
| `dropdownMaxHeight` | Optional | `string`                     | `'12rem'` | CSS max-height for the dropdown panel                 |
| `renderDropdown`    | Optional | `(props: TagInputDropdownProps) => React.ReactNode` | —       | Replaces the built-in dropdown with custom content |

### `TagInputRef` (imperative handle)

When `ref` is forwarded to `TagInput`, it exposes:

| Method              | Description                      |
| ------------------- | -------------------------------- |
| `clearInputValue()` | Clears the text input            |
| `focus()`           | Focuses the input                |
| `blur()`            | Blurs the input                  |
| `getInputValue()`   | Returns the current input string |

## Example

```tsx
import { TagInput } from "@tetherto/mdk-react-devkit"

// Basic with options
const [tags, setTags] = useState<string[]>([])

<TagInput
  value={tags}
  onTagsChange={setTags}
  options={["Antminer S19", "Avalon A1346", "Whatsminer M50"]}
  placeholder="Search models..."
  onSubmit={(t) => applySearch(t)}
/>

// Custom dropdown (e.g. with checkmarks)
<TagInput
  value={tags}
  onTagsChange={setTags}
  options={options}
  renderDropdown={({ filteredOptions, selectedTags, onSelect, getOptionValue, getOptionLabel, listboxId }) => (
    <div id={listboxId} role="listbox">
      {filteredOptions.map((opt) => (
        <div
          key={getOptionValue(opt)}
          role="option"
          aria-selected={selectedTags.includes(getOptionValue(opt))}
          onMouseDown={(e) => { e.preventDefault(); onSelect(opt) }}
        >
          {getOptionLabel(opt)}
        </div>
      ))}
    </div>
  )}
/>
```

## Notes

- Selecting an option that is already tagged removes it (toggle behavior)
- Pressing Backspace on an empty input removes the last tag
- The search-variant clear icon only appears when there are active tags
