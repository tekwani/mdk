'use strict'

const { z } = require('zod')

module.exports = {
  schema: { deviceId: z.string().describe('The device ID to query') },
  handler: async ({ deviceId }, { mdkClient }) => {
    const caps = await mdkClient.getCapabilities(deviceId)
    return { content: [{ type: 'text', text: JSON.stringify(caps, null, 2) }] }
  }
}
