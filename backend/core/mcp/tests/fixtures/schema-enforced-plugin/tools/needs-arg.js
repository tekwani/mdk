'use strict'

const { z } = require('zod')

module.exports = {
  schema: { name: z.string() },
  handler: async ({ name }) => ({ content: [{ type: 'text', text: 'hello ' + name }] })
}
