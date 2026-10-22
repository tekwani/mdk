import type { UnknownRecord } from '@primitives'

export const MOVE_MINER = 'Move Miner'
export const REPAIR = 'Repair'
export const GO_TO_EXPLORER_ACTION = 'Go To Explorer'
export const INVENTORY_LOGS_ACTION = 'Inventory Logs'
export const ADD_COMMENT_ACTION = 'Add Comment'
export const DELETE_MINER = 'Delete Miner'

export const MINER_ACTIONS = [
  MOVE_MINER,
  REPAIR,
  INVENTORY_LOGS_ACTION,
  GO_TO_EXPLORER_ACTION,
  ADD_COMMENT_ACTION,
  DELETE_MINER,
] as const
export type Miner = {
  id?: string
  type?: string
  code?: string
  container?: string
  pos?: string
  serialNum?: string
  macAddress?: string
  createdAt?: number
  updatedAt?: number
  location?: string
  status?: string
  site?: string
  tags?: string[]
  brand?: string
  raw?: UnknownRecord
  [key: string]: unknown
}
export const MINER_STATUSES = {
  OK_BRAND_NEW: 'ok_brand_new',
  OK_REPAIRED: 'ok_repaired',
  FAULTY: 'faulty',
  ON_HOLD: 'on_hold',
  SCRAPPED: 'scrapped',
  DISPOSED: 'disposed',
  UNKNOWN: 'unknown',
} as const
