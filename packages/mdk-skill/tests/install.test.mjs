import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { installSkills, CLIENT_DIRS } from '../src/index.mjs'

const quiet = { onWarn: () => {} }

describe('installSkills', () => {
  let root
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-install-')) })
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }) })

  it('installs into an empty project', () => {
    const r = installSkills({ client: 'claude', target: root, ...quiet })
    assert.ok(r.skills.includes('mdk'))
    assert.deepEqual(r.skipped, [])
    assert.ok(fs.existsSync(path.join(root, '.claude', 'skills', 'mdk', 'SKILL.md')))
  })

  it('replaces an existing suite skill', () => {
    installSkills({ client: 'claude', target: root, ...quiet })
    const stale = path.join(root, '.claude', 'skills', 'mdk', 'stale.txt')
    fs.writeFileSync(stale, 'old')
    const r = installSkills({ client: 'claude', target: root, ...quiet })
    assert.deepEqual(r.skipped, [])
    assert.equal(fs.existsSync(stale), false)
  })

  it('keeps a same-named skill without the suite marker and warns', () => {
    const own = path.join(root, '.claude', 'skills', 'mdk')
    fs.mkdirSync(own, { recursive: true })
    fs.writeFileSync(path.join(own, 'SKILL.md'), '---\nname: mdk\ndescription: mine\n---\nmine\n')
    const warnings = []
    const r = installSkills({ client: 'claude', target: root, onWarn: (m) => warnings.push(m) })
    assert.equal(fs.readFileSync(path.join(own, 'SKILL.md'), 'utf8'), '---\nname: mdk\ndescription: mine\n---\nmine\n')
    assert.deepEqual(r.skipped.map((s) => s.skill), ['mdk'])
    assert.equal(warnings.length, 1)
    assert.ok(fs.existsSync(path.join(root, '.claude', 'skills', 'mdk-worker-plugin', 'SKILL.md')))
  })

  it('refuses a symlinked client dir', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-outside-'))
    try {
      fs.symlinkSync(outside, path.join(root, '.claude'))
      assert.throws(() => installSkills({ client: 'claude', target: root, ...quiet }), /symlink/)
      assert.deepEqual(fs.readdirSync(outside), [])
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })

  it('refuses a symlinked skills dir', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-outside-'))
    try {
      fs.mkdirSync(path.join(root, '.cursor'))
      fs.symlinkSync(outside, path.join(root, '.cursor', 'skills'))
      assert.throws(() => installSkills({ client: 'cursor', target: root, ...quiet }), /symlink/)
      assert.deepEqual(fs.readdirSync(outside), [])
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })

  it('skips a symlinked skill dir without touching its target', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-outside-'))
    try {
      fs.writeFileSync(path.join(outside, 'keep.txt'), 'x')
      fs.mkdirSync(path.join(root, '.claude', 'skills'), { recursive: true })
      fs.symlinkSync(outside, path.join(root, '.claude', 'skills', 'mdk'))
      const r = installSkills({ client: 'claude', target: root, ...quiet })
      assert.deepEqual(r.skipped.map((s) => s.reason), ['is a symlink'])
      assert.deepEqual(fs.readdirSync(outside), ['keep.txt'])
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })
})

const STAMPED = '---\nname: x\nmetadata:\n  suite: mdk-developer-skill\n  mdk_version: "0.0.0"\n---\n# old\n'
const USER = '---\nname: mdk-mine\ndescription: user-authored\n---\n# mine\n'

describe('installSkills stale sweep', () => {
  let target
  before(() => { target = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-skill-install-')) })
  after(() => { fs.rmSync(target, { recursive: true, force: true }) })

  it('sweeps stale MDK-shipped skills and leaves user-authored skills alone', () => {
    const dir = path.join(target, ...CLIENT_DIRS.claude)
    fs.mkdirSync(path.join(dir, 'mdk-renamed-away'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'mdk-renamed-away', 'SKILL.md'), STAMPED)
    fs.mkdirSync(path.join(dir, 'mdk-mine'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'mdk-mine', 'SKILL.md'), USER)
    fs.mkdirSync(path.join(dir, 'no-skill-md'), { recursive: true })

    const { skills, installed } = installSkills({ client: 'claude', target, ...quiet })

    assert.ok(skills.includes('mdk'))
    assert.deepEqual(installed[0].removed, ['mdk-renamed-away'])
    assert.equal(fs.existsSync(path.join(dir, 'mdk-renamed-away')), false)
    assert.equal(fs.existsSync(path.join(dir, 'mdk-mine', 'SKILL.md')), true)
    assert.equal(fs.existsSync(path.join(dir, 'no-skill-md')), true)
    for (const s of skills) assert.equal(fs.existsSync(path.join(dir, s, 'SKILL.md')), true)
  })

  it('reports nothing removed on a clean rerun', () => {
    const { installed } = installSkills({ client: 'claude', target, ...quiet })
    assert.deepEqual(installed[0].removed, [])
  })
})
