'use strict'

const test = require('brittle')
const MockControlAgent = require('../../mock-control-agent')

test('init() runs the mock server for each configured thing and skips the edit server when no port is given', async (t) => {
  const runs = []
  const agent = new MockControlAgent({ thgs: [{ id: 'a' }, { id: 'b' }] })
  await agent.init(async (thing) => { runs.push(thing); return { handle: thing.id } })

  t.is(runs.length, 2, 'runMockServer should be called once per thing')
  t.is(agent.things.length, 2)
  t.alike(agent.things[0].id, 'a')
  t.is(agent.things[0].handle, 'a', 'merges the mock server result onto the tracked thing')
  t.ok(typeof agent.things[0].mockId === 'string' && agent.things[0].mockId.length > 0, 'assigns a generated mockId')
  t.not(agent.things[0].mockId, agent.things[1].mockId, 'mockIds are unique per thing')
  t.absent(agent.server, 'no HTTP edit server is started without a port')
  t.pass()
})

test('generateId() returns a random 32-char hex string, unique per call', (t) => {
  const agent = new MockControlAgent({ thgs: [] })
  const a = agent.generateId()
  const b = agent.generateId()
  t.ok(/^[0-9a-f]{32}$/.test(a), 'looks like 16 random bytes as hex')
  t.not(a, b, 'two calls should not collide')
  t.pass()
})

test('runMockDataEditServer() does nothing when port is falsy', async (t) => {
  const agent = new MockControlAgent({ thgs: [] })
  await agent.runMockDataEditServer(0)
  t.absent(agent.server, 'no server should be created for a falsy port')
  t.pass()
})

test('runMockDataEditServer() starts a listening fastify server when a port is given', async (t) => {
  const agent = new MockControlAgent({ thgs: [{ id: 'only' }] })
  await agent.init(async (thing) => ({ ...thing, started: true }))
  // runMockDataEditServer treats a falsy port (including 0) as "don't start" — see the
  // dedicated test below — so a real port number is required here.
  await agent.runMockDataEditServer(18475)

  t.ok(agent.server, 'server should be assigned')
  t.ok(agent.server.server.listening, 'the underlying HTTP server should be listening')

  // No routes are registered by runMockDataEditServer itself (only the onRequest hook),
  // so any request 404s — this just confirms the onRequest hook ran without throwing
  // and the server is genuinely serving requests.
  const res = await agent.server.inject({ method: 'GET', url: '/anything' })
  t.is(res.statusCode, 404)

  await agent.server.close()
  t.pass()
})
