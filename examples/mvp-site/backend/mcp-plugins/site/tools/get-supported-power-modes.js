'use strict'

const { z } = require('zod')

// Keyed by contract metadata.brand — deviceIds are UUIDs, so the owning
// worker's contract is the only family signal.
const POWER_MODES_BY_BRAND = {
  Whatsminer: ['low', 'normal', 'high', 'sleep'],
  Antminer: ['sleep', 'normal'],
  Avalon: ['normal', 'high', 'sleep']
}

module.exports = {
  schema: { deviceId: z.string().describe('The device ID to query') },
  handler: async ({ deviceId }, { mdkClient }) => {
    const cfg = await mdkClient.pullTelemetry(deviceId, { type: 'config' }).catch(() => null)
    const brand = cfg && cfg.config && cfg.config.contract && cfg.config.contract.brand
    const modes = brand ? POWER_MODES_BY_BRAND[brand] : null
    const result = modes
      ? { deviceId, brand, supportedPowerModes: modes }
      : { deviceId, supportedPowerModes: null, reason: 'device type not recognised' }
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
}
