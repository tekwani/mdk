'use strict'

const test = require('brittle')
const { redactSecrets, isSecretKey, REDACTED, MAX_DEPTH } = require('../../lib/modules/action-manager/redact')

test('redact - secret-looking keys match case-insensitively', (t) => {
  for (const k of ['password', 'PASSWORD', 'pass', 'secret', 'token', 'apiKey', 'api_key', 'API-KEY', 'apiSecret', 'privateKey',
    'accessKey', 'credentials', 'worker_password', 'poolPassword', 'clientSecret', 'authToken']) {
    t.ok(isSecretKey(k), k)
  }
  for (const k of ['mode', 'url', 'username', 'user', 'id', 'bypass', 'passive', 'tokens_count', 'workerId']) {
    t.absent(isSecretKey(k), k)
  }
})

test('redact - replaces secret fields recursively and leaves the input intact', (t) => {
  const params = [
    { address: '10.0.0.1', password: 'admin', pools: [{ url: 'stratum+tcp://p', user: 'acc.w1', worker_password: 'x' }] },
    { opts: { credentials: { user: 'u', pass: 'p' }, apiKey: 42 } },
    'plain',
    7
  ]
  const copy = JSON.parse(JSON.stringify(params))
  const out = redactSecrets(params)

  t.alike(out, [
    { address: '10.0.0.1', password: REDACTED, pools: [{ url: 'stratum+tcp://p', user: 'acc.w1', worker_password: REDACTED }] },
    { opts: { credentials: REDACTED, apiKey: REDACTED } },
    'plain',
    7
  ])
  t.alike(params, copy, 'input not mutated')
  t.is(redactSecrets(null), null)
  t.is(redactSecrets('x'), 'x')
})

test('redact - depth is bounded', (t) => {
  let deep = { password: 'p' }
  for (let i = 0; i < MAX_DEPTH + 5; i++) deep = { next: deep }
  const out = JSON.stringify(redactSecrets(deep))
  t.absent(out.includes('"p"'), 'nothing past the bound leaks')
  t.ok(out.includes(REDACTED))
})
