'use strict'

const { logger } = require('@tetherto/mdk-gateway/plugin')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Streams query.count chunks ("chunk-0", "chunk-1", ...); count=0 streams until
// the peer goes away. Logs 'stream-closed' when the response closes.
async function chunks (req, raw) {
  const count = Number(req.query.count)
  const state = { closed: false }
  raw.on('close', () => {
    state.closed = true
    logger.info('stream-closed')
  })

  raw.writeHead(200, { 'content-type': 'text/plain', 'x-echo-tag': String(req.query.tag || '') })

  let i = 0
  while (!state.closed) {
    if (count !== 0 && i >= count) return raw.end()
    raw.write(`chunk-${i++}\n`)
    await sleep(10)
  }
}

// Writes one chunk, then throws.
async function failMid (req, raw) {
  raw.writeHead(200, { 'content-type': 'text/plain' })
  raw.write('chunk-0\n')
  await sleep(10)
  throw new Error('db connection lost')
}

async function fail () {
  const err = new Error('ERR_STREAM_REJECTED: no stream for you')
  err.statusCode = 403
  throw err
}

module.exports = { chunks, fail, failMid }
