'use strict'

const test = require('brittle')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { buildFirewall, _writeKeyFile } = require('../../lib/runtime')
const { tmpDir, capturingLogger } = require('../fixtures/helpers')

const POSIX = process.platform !== 'win32'
const key = () => crypto.randomBytes(32)

// Writes `text` to `file` with exactly `mode` (no umask).
function writeKey (file, text, mode = 0o644) {
  fs.writeFileSync(file, text)
  fs.chmodSync(file, mode)
}

// true = allowed through, false = blocked.
function firewallFor (allowedKeyFiles, allowedKeys) {
  const logger = capturingLogger()
  const firewall = buildFirewall({ allowedKeys, allowedKeyFiles, logger })
  return { logger, allows: async (k) => (await firewall(k)) === false }
}

test('firewall: a 0644 key file owned by this user is trusted; tokens that are not keys are ignored', async (t) => {
  const dir = tmpDir(t)
  const file = path.join(dir, 'gateway.key')
  const [a, b, other] = [key(), key(), key()]
  writeKey(file, `\n ${a.toString('hex').toUpperCase()} not-a-key ${b.toString('hex')}abcd\n`)
  const { allows } = firewallFor([file])
  t.ok(await allows(a), 'a valid key, any case and padding, is admitted')
  t.absent(await allows(b), 'a token longer than 64 hex characters is not a key')
  t.absent(await allows(other))
})

test('firewall: allowedKeys entries must be 32-byte hex keys', async (t) => {
  const a = key()
  const { allows } = firewallFor([], [a.toString('hex').slice(0, 10), a])
  t.ok(await allows(a))
  t.absent(await allows(key()))
})

test('firewall: group/world-writable key files are skipped with one warning', { skip: !POSIX }, async (t) => {
  const dir = tmpDir(t)
  const file = path.join(dir, 'gateway.key')
  const a = key()
  writeKey(file, a.toString('hex'), 0o666)
  const { allows, logger } = firewallFor([file])
  t.absent(await allows(a), 'world-writable: skipped')
  t.absent(await allows(a))
  const warnings = () => logger.lines.filter((l) => l.includes('ignoring allowed key file'))
  t.is(warnings().length, 1, 'warned once, not per connection')
  t.ok(warnings()[0].includes('group/world-writable'))

  fs.chmodSync(file, 0o620)
  t.absent(await allows(a), 'group-writable: skipped')

  fs.chmodSync(file, 0o600)
  t.ok(await allows(a), 'trusted once the mode is fixed')
  fs.chmodSync(file, 0o666)
  t.absent(await allows(a))
  t.is(warnings().length, 2, 'warns again after the file was fixed and broke again')
})

test('firewall: a symlinked or non-regular key file is skipped', { skip: !POSIX }, async (t) => {
  const dir = tmpDir(t)
  const real = path.join(dir, 'real.key')
  const link = path.join(dir, 'link.key')
  const a = key()
  writeKey(real, a.toString('hex'))
  fs.symlinkSync(real, link)
  const { allows, logger } = firewallFor([link, dir])
  t.absent(await allows(a), 'symlink to a good file is not followed')
  // capturingLogger joins its arguments: 'warn:<format> <file> <reason>'
  t.ok(logger.lines.some((l) => l.endsWith(`${link} is a symlink`)))
  t.ok(logger.lines.some((l) => l.endsWith(`${dir} is not a regular file`)))
})

test('firewall: a missing key file contributes no keys and no warning', async (t) => {
  const { allows, logger } = firewallFor([path.join(tmpDir(t), 'missing.key')])
  t.absent(await allows(key()))
  t.absent(logger.lines.some((l) => l.includes('ignoring')))
})

test('key file write: atomic, 0644, no temp file left behind on success or failure', async (t) => {
  const dir = tmpDir(t)
  const file = path.join(dir, 'run', 'echo.key')
  const k = key()
  _writeKeyFile(file, k)
  t.is(fs.readFileSync(file, 'utf8'), k.toString('hex'))
  if (POSIX) {
    t.is(fs.statSync(file).mode & 0o777, 0o644)
    t.is(fs.statSync(path.dirname(file)).mode & 0o777, 0o700, 'a new directory is owner-only')
  }
  t.alike(fs.readdirSync(path.dirname(file)), ['echo.key'])

  const blocked = path.join(dir, 'run', 'taken')
  fs.mkdirSync(path.join(blocked, 'child'), { recursive: true })
  t.exception(() => _writeKeyFile(blocked, k), 'renaming over a non-empty directory fails')
  t.alike(fs.readdirSync(path.dirname(file)).sort(), ['echo.key', 'taken'], 'the temp file was removed')
})
