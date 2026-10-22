'use strict'

const test = require('brittle')
const { main, ENV_OPTIONS } = require('../../bin/run-app')

function fakeIo (over = {}) {
  const calls = { sent: [], stderr: [], exit: [], handlers: {} }
  const io = {
    send: (msg) => calls.sent.push(msg),
    stderr: (line) => calls.stderr.push(line),
    exit: (code) => calls.exit.push(code),
    on: (event, fn) => { calls.handlers[event] = fn },
    ...over
  }
  return { io, calls }
}

test('run-app: reports a missing options variable', async (t) => {
  const { io, calls } = fakeIo()
  t.is(await main({}, io), null)
  t.is(calls.sent[0].type, 'error')
  t.ok(calls.sent[0].message.startsWith('ERR_APP_RUNTIME_OPTIONS_REQUIRED'))
  t.alike(calls.exit, [1])
  t.ok(calls.stderr[0].startsWith('mdk-app-runtime: '))
})

test('run-app: rejects options that are not a JSON object', async (t) => {
  for (const value of ['not json', '[]', 'null', '5']) {
    const { io, calls } = fakeIo()
    await main({ [ENV_OPTIONS]: value }, io)
    t.ok(calls.sent[0].message.startsWith('ERR_APP_RUNTIME_OPTIONS_INVALID'), `rejects ${value}`)
    t.alike(calls.exit, [1])
  }
})

test('run-app: a failed start is reported without an IPC channel, and a throwing channel is tolerated', async (t) => {
  const quiet = fakeIo({ send: null })
  await main({ [ENV_OPTIONS]: JSON.stringify({}) }, quiet.io)
  t.alike(quiet.calls.exit, [1], 'createAppRuntime rejects empty options')
  t.is(quiet.calls.sent.length, 0)

  const broken = fakeIo({ send: () => { throw new Error('channel closed') } })
  await main({ [ENV_OPTIONS]: JSON.stringify({}) }, broken.io)
  t.alike(broken.calls.exit, [1])
  t.ok(broken.calls.stderr[0].startsWith('mdk-app-runtime: '))
})

test('run-app: uses process defaults when no io is injected for a bad environment', async (t) => {
  const exit = process.exit
  const write = process.stderr.write
  const codes = []
  process.exit = (code) => { codes.push(code) }
  process.stderr.write = () => true
  try {
    await main({}, undefined)
  } finally {
    process.exit = exit
    process.stderr.write = write
  }
  t.alike(codes, [1])
})

test('run-app: --help prints usage and exits 0 without starting anything', async (t) => {
  for (const flag of ['--help', '-h']) {
    const out = []
    const { io, calls } = fakeIo({ stdout: (text) => out.push(text) })
    t.is(await main({}, io, [flag]), null)
    t.alike(calls.exit, [0], `${flag} exits 0`)
    t.ok(out.join('').startsWith('Usage: '), `${flag} prints usage`)
    t.is(calls.sent.length, 0)
  }
})
