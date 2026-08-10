'use strict'

module.exports = {
  schema: {},
  handler: async (args, { mdkClient }) => {
    const status = await mdkClient.getStatus()
    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
  }
}
