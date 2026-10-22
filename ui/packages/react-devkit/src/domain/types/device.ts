import type { AlertRecord } from './alerts'

/**
 * The snapshot fields the toolkit reads from a device's latest report. Anything
 * else your Worker reports rides along under the index signatures.
 */
export type DeviceSnap = {
  stats?: { status?: string, [key: string]: unknown }
  config?: { firmware_ver?: string, power_mode?: string, [key: string]: unknown }
  [key: string]: unknown
}

/** A device's latest report. */
export type DeviceLast = {
  err?: string | null
  snap?: DeviceSnap
  alerts?: AlertRecord[] | null
  [key: string]: unknown
}

/** Where a device sits and what identifies it physically. */
export type DeviceInfo = {
  container?: string
  pos?: string
  serialNum?: string
  macAddress?: string | null
  [key: string]: unknown
}

/**
 * A device row as the devkit components consume it: `id` and `type` (e.g.
 * `miner-am-s19`), plus whatever of the optional fields your data has.
 */
export type Device = {
  id: string
  type: string
  code?: string
  tags?: string[]
  address?: string | null
  info?: DeviceInfo
  last?: DeviceLast
  alerts?: AlertRecord[] | null
  [key: string]: unknown
}

/** {@link Device} with its latest report flattened, as `getDeviceData` returns it. */
export type DeviceData = Pick<Device, 'id' | 'type' | 'tags' | 'address' | 'info'> & {
  snap: DeviceSnap
  alerts?: AlertRecord[] | null
  err?: string | null
}

type MinerHashrateMhs = {
  t_5m?: number
}

type MinerInfo = {
  container?: string
  pos?: string
  macAddress?: string
  serialNum?: string
}

export type MinerStats = {
  status?: string
  uptime_ms?: number
  power_w?: number
  hashrate_mhs?: MinerHashrateMhs
  poolHashrate?: string
  temperature_c?: { max?: number }
}

export type MinerConfig = {
  firmware_ver?: string
  power_mode?: string
  led_status?: boolean
}

type MinerDeviceSnapshot = {
  last?: { snap?: { config?: MinerConfig } }
}

export type MinerRecord = {
  id?: string
  shortCode?: string
  info?: MinerInfo
  address?: string
  type?: string
  alerts?: unknown[]
  stats?: MinerStats
  config?: MinerConfig
  device?: MinerDeviceSnapshot
  error?: string
  err?: string
  isPoolStatsEnabled?: boolean
}
