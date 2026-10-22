/**
 * Synthetic demo data for the Device Explorer page.
 *
 * All identifiers (IDs, serials, MAC addresses, IP addresses, site names,
 * comments, users) are fully fabricated. MAC addresses use the 02:xx
 * locally-administered prefix so they cannot collide with real hardware.
 */

import { UNITS } from '@tetherto/mdk-react-devkit/primitives'

const SITE = 'Demo Site'
const NOW = Date.UTC(2026, 0, 1)

const pad = (n: number, width = 3) => String(n).padStart(width, '0')

const mac = (n: number): string => {
  const hi = pad(Math.floor(n / 256), 2)
  const lo = pad(n % 256, 2)
  return `02:00:00:00:${hi}:${lo}`
}

const ip = (n: number): string => `192.168.1.${n}`

type MinerStatus = 'online' | 'offline' | 'error' | 'maintenance'

const MINER_TYPE = 'miner-demo-m1'

const makeMiner = (n: number, status: MinerStatus) => {
  const id = `miner-${pad(n)}`
  const code = `DEMO-M${pad(n)}`
  const serialNum = `SN-M${pad(n)}`
  const macAddress = mac(n)
  const isOnline = status === 'online'
  const container = status === 'maintenance' ? 'maintenance' : `demo-container-${((n - 1) % 2) + 1}`

  const info = {
    site: SITE,
    container,
    pos: isOnline ? `row-${n}` : '',
    serialNum,
    macAddress,
    createdAt: NOW - 30 * 24 * 60 * 60 * 1_000,
    updatedAt: NOW,
  }

  const stats = isOnline
    ? {
        status: 'online',
        uptime_ms: 6 * 60 * 60 * 1_000,
        power_w: 3100,
        hashrate_mhs: { t_5m: 110_000_000 },
        poolHashrate: `108 ${UNITS.HASHRATE_TH_S}`,
        temperature_c: { max: 62 },
      }
    : { status }

  const config = isOnline
    ? { firmware_ver: '1.0.0-demo', power_mode: 'normal', led_status: false }
    : undefined

  return {
    id,
    type: MINER_TYPE,
    shortCode: code,
    code,
    container,
    position: info.pos,
    address: isOnline ? ip(n) : null,
    ip: isOnline ? ip(n) : null,
    status: stats.status,
    isPoolStatsEnabled: true,
    tags: ['t-miner', MINER_TYPE, `code-${code}`, `container-${container}`],
    info,
    stats,
    config,
    alerts: null,
    error: status === 'error' ? 'demo_error' : null,
    err: null,
    device: {
      id,
      code,
      type: MINER_TYPE,
      info,
      address: isOnline ? ip(n) : null,
      port: 5020,
      last: {
        alerts: null,
        err: null,
        snap: {
          stats,
          ...(config ? { config } : {}),
        },
      },
      isRaw: true,
    },
  }
}

const MINER_STATUSES: MinerStatus[] = ['online', 'offline', 'error', 'maintenance']

export const minersData = MINER_STATUSES.map((status, i) => makeMiner(i + 1, status))
