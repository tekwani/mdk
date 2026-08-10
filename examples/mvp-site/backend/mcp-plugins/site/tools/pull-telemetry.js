'use strict'

const { z } = require('zod')

module.exports = {
  schema: {
    deviceId: z.string().describe('The device ID to query'),
    query: z.string().default('metrics').describe('Telemetry query type (e.g. "metrics")')
  },
  handler: async ({ deviceId, query }, { mdkClient }) => {
    const result = await mdkClient.pullTelemetry(deviceId, query)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
}
