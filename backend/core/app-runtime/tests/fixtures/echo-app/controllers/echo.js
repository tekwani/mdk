'use strict'

const { logger, onReady } = require('@tetherto/mdk-gateway/plugin')

onReady(() => logger.info('echo-ready'))

module.exports = async function echo (req) {
  return { params: req.params, query: req.query, body: req.body, headers: req.headers }
}
