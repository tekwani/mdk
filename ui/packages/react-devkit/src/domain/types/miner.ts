import type { AlertRecord } from './alerts'

export type MinerStats = {
  status: string
  errors: AlertRecord[] | unknown
  hashrate_mhs: Partial<{
    t_5m: number
    [key: string]: unknown
  }>
  are_all_errors_minor: boolean
  [key: string]: unknown
}

export type MinerConfig = {
  power_mode: string
  [key: string]: unknown
}
