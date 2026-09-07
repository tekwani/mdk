# Socket

Per-socket panel representing a single PDU slot in a container. Shows the miner slotted into that slot, its power/current draw, operating status, heatmap data (temperature or hashrate), and quick actions (add miner, edit flow).

## Props

| Prop                          | Status   | Type                           | Default     | Description                                                           |
| ----------------------------- | -------- | ------------------------------ | ----------- | --------------------------------------------------------------------- |
| `socket`                      | Optional | `number \| null`               | `null`      | Slot index displayed as a label                                       |
| `enabled`                     | Optional | `boolean`                      | `false`     | Whether the slot is enabled                                           |
| `power_w`                     | Optional | `number \| null`               | `null`      | Power draw in watts                                                   |
| `current_a`                   | Optional | `number \| null`               | `null`      | Current draw in amperes                                               |
| `selected`                    | Optional | `boolean`                      | `false`     | Whether the socket is shown in the selected state                     |
| `miner`                       | Optional | `Miner \| null`                | `null`      | Miner data for the device in this slot                                |
| `heatmap`                     | Optional | `Heatmap \| null`              | `null`      | Heatmap mode config; enables thermal/hashrate overlay                 |
| `isEditFlow`                  | Optional | `boolean`                      | `false`     | Shows the edit-flow reticle when `true`                               |
| `clickDisabled`               | Optional | `boolean`                      | `false`     | Disables click interactions                                           |
| `cooling`                     | Optional | `boolean \| undefined`         | `undefined` | Cooling fan active state indicator; `undefined` means no cooling data |
| `isEmptyPowerDashed`          | Optional | `boolean`                      | `false`     | Shows dashed border for empty-power slots                             |
| `isContainerControlSupported` | Optional | `boolean`                      | `false`     | Shows container-level action buttons                                  |
| `pdu`                         | Optional | `{ pdu?: string \| number }`   | —           | PDU reference metadata                                                |
| `innerRef`                    | Optional | `ForwardedRef<HTMLDivElement>` | —           | Forwarded ref for the container div                                   |

## Minimal example

```tsx
import { Socket } from "@tetherto/mdk-react-devkit";

<Socket socket={1} enabled={true} power_w={3250} current_a={14.5} />
```
