import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT = fileURLToPath(new URL('../src/skills/mdk-publish-security/scripts/scan-packages.mjs', import.meta.url))

describe('scan-packages --out', () => {
  it('refuses an existing file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-scan-test-'))
    try {
      const out = path.join(dir, 'report.md')
      fs.writeFileSync(out, 'keep')
      const r = spawnSync(process.execPath, [SCRIPT, '--out', out], { encoding: 'utf8' })
      assert.equal(r.status, 2)
      assert.match(r.stderr, /already exists/)
      assert.equal(fs.readFileSync(out, 'utf8'), 'keep')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('refuses a symlink, even a dangling one', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-scan-test-'))
    try {
      const out = path.join(dir, 'report.md')
      fs.symlinkSync(path.join(dir, 'victim'), out)
      const r = spawnSync(process.execPath, [SCRIPT, '--out', out], { encoding: 'utf8' })
      assert.equal(r.status, 2)
      assert.equal(fs.existsSync(path.join(dir, 'victim')), false)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
