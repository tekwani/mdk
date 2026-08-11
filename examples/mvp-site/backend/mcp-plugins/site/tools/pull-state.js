'use strict'

const { z } = require('zod')

module.exports = {
  schema: { deviceId: z.string().describe('The device ID to query') },
  handler: async ({ deviceId }, { mdkClient }) => {
    const result = await mdkClient.pullState(deviceId)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
}
