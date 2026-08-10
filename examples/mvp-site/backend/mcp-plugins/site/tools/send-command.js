'use strict'

const { z } = require('zod')

module.exports = {
  schema: {
    deviceId: z.string().describe('The device ID to target'),
    command: z.string().describe('The command name'),
    params: z.record(z.unknown()).default({}).describe('Command parameters')
  },
  handler: async ({ deviceId, command, params }, { mdkClient }) => {
    const result = await mdkClient.sendCommand(deviceId, command, params)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
}
