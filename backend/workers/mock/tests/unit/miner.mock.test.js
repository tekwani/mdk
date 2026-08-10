'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const MinerMock = require('../../miner.mock')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-worker-mock-miner-test-' + Date.now())

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

test('_resolveCmd - resolves a generic command when no type-specific override exists', (t) => {
  const dir = path.join(FIXTURES_DIR, 'generic-only')
  writeFixture(dir, {
    'cmds/reboot.js': 'module.exports = { generic: true }'
  })
  class TestMiner extends MinerMock { static dir = dir }
  const miner = new TestMiner({ type: 'whatsminer' })
  t.alike(miner._resolveCmd('reboot'), { generic: true })
  t.pass()
})

test('_resolveCmd - prefers generic over type-specific by default when both exist', (t) => {
  const dir = path.join(FIXTURES_DIR, 'type-override')
  writeFixture(dir, {
    'cmds/reboot.js': 'module.exports = { which: "generic" }',
    'cmds/whatsminer/reboot.js': 'module.exports = { which: "type" }'
  })
  class TestMiner extends MinerMock { static dir = dir }
  const miner = new TestMiner({ type: 'whatsminer' })
  t.alike(miner._resolveCmd('reboot'), { which: 'generic' })
  t.pass()
})

test('_resolveCmd - falls back to type-specific when no generic file exists', (t) => {
  const dir = path.join(FIXTURES_DIR, 'generic-missing')
  writeFixture(dir, {
    'cmds/whatsminer/setLED.js': 'module.exports = { which: "type" }'
  })
  class TestMiner extends MinerMock { static dir = dir }
  const miner = new TestMiner({ type: 'whatsminer' })
  t.alike(miner._resolveCmd('setLED'), { which: 'type' })
  t.pass()
})

test('_resolveCmd - typeFirst=true still prefers type-specific when both exist', (t) => {
  const dir = path.join(FIXTURES_DIR, 'type-first-both')
  writeFixture(dir, {
    'cmds/reboot.js': 'module.exports = { which: "generic" }',
    'cmds/whatsminer/reboot.js': 'module.exports = { which: "type" }'
  })
  class TestMiner extends MinerMock { static dir = dir }
  const miner = new TestMiner({ type: 'whatsminer' })
  t.alike(miner._resolveCmd('reboot', { typeFirst: true }), { which: 'type' })
  t.pass()
})

test('_resolveCmd - typeFirst=true falls back to type-specific-only file', (t) => {
  const dir = path.join(FIXTURES_DIR, 'type-first-only')
  writeFixture(dir, {
    'cmds/whatsminer/setLED.js': 'module.exports = { which: "type-only" }'
  })
  class TestMiner extends MinerMock { static dir = dir }
  const miner = new TestMiner({ type: 'whatsminer' })
  t.alike(miner._resolveCmd('setLED', { typeFirst: true }), { which: 'type-only' })
  t.pass()
})

test('_resolveCmd - returns null when neither generic nor type-specific file exists', (t) => {
  const dir = path.join(FIXTURES_DIR, 'missing')
  fs.mkdirSync(dir, { recursive: true })
  class TestMiner extends MinerMock { static dir = dir }
  const miner = new TestMiner({ type: 'whatsminer' })
  t.is(miner._resolveCmd('doesNotExist'), null)
  t.pass()
})
