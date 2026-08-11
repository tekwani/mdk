'use strict'

const crypto = require('crypto')
const fastify = require('fastify')

class MockControlAgent {
  constructor (opts) {
    this.opts = opts
    this.things = []
  }

  async init (runMockServer) {
    for (const thing of this.opts.thgs) {
      const id = this.generateId()
      const mock = await runMockServer(thing)
      this.things.push({
        mockId: id,
        ...thing,
        ...mock
      })
    }

    await this.runMockDataEditServer(this.opts.port)
  }

  async runMockDataEditServer (port) {
    if (!port) return
    this.server = fastify()
    this.server.addHook('onRequest', (req, _, next) => {
      req.ctx = {
        things: this.things,
        mockControl: this
      }
      next()
    })

    await this.server.listen({ port, host: '127.0.0.1' })
  }

  generateId () {
    return crypto.randomBytes(16).toString('hex')
  }
}

module.exports = MockControlAgent
