import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSiteDescription,
  compileEnvelope,
  sizeSite,
  matchRecommendation
} from '../src/skills/mdk-site-sizing/scripts/lib.mjs'

const fixtures = [
  {
    profileId: 'cap-10devices-1workers',
    tier: 'edge',
    deviceCount: 10,
    workerCount: 1,
    workers: [{ type: 'mdk-worker-whatsminer', model: 'm56s', deviceCount: 10 }],
    status: 'green',
    rssSumMiB: 400,
    cpuSumPct: 20,
    readP99Ms: 40,
    actionP99Ms: 70,
    source: 'fixture'
  },
  {
    profileId: 'cap-100devices-2workers',
    tier: 'site-server',
    deviceCount: 100,
    workerCount: 2,
    workers: [{ type: 'mdk-worker-whatsminer', model: 'm56s', deviceCount: 100 }],
    status: 'green',
    rssSumMiB: 1200,
    cpuSumPct: 60,
    readP99Ms: 70,
    actionP99Ms: 110,
    source: 'fixture'
  }
]

describe('parseSiteDescription', () => {
  it('reads a number-word family and edge host', () => {
    const facts = parseSiteDescription(
      'A single rack of ten Whatsminer M56S colocated with a small edge box: 4 physical cores, 8 GiB RAM, SATA SSD.'
    )
    assert.equal(facts.deviceCount, 10)
    assert.equal(facts.devices[0].type, 'mdk-worker-whatsminer')
    assert.equal(facts.devices[0].model, 'm56s')
    assert.equal(facts.host.tier, 'edge')
    assert.equal(facts.host.cpuCoresPhysical, 4)
    assert.equal(facts.host.ramGiB, 8)
    assert.equal(facts.host.diskType, 'sata')
  })

  it('reads mixed families and a site-server host', () => {
    const facts = parseSiteDescription(
      'Sixty Whatsminer M56S and forty Antminer S19 XP sharing one 16-core NVMe site server.'
    )
    assert.equal(facts.deviceCount, 100)
    const types = facts.devices.map((d) => d.type).sort()
    assert.deepEqual(types, ['mdk-worker-antminer', 'mdk-worker-whatsminer'])
    assert.equal(facts.host.tier, 'site-server')
    assert.equal(facts.host.diskType, 'nvme')
  })

  it('maps MicroBT to whatsminer', () => {
    const facts = parseSiteDescription('About fifty MicroBT miners on a proper site server.')
    assert.equal(facts.deviceCount, 50)
    assert.equal(facts.devices[0].type, 'mdk-worker-whatsminer')
    assert.equal(facts.host.tier, 'site-server')
  })
})

describe('sizeSite', () => {
  const envelope = compileEnvelope(fixtures)

  it('stays inside the green covering profile', () => {
    const rec = sizeSite(parseSiteDescription('ten Whatsminer M56S on an edge box, 4 cores, 8 GiB, SATA'), envelope)
    assert.equal(rec.status, 'green')
    assert.equal(rec.workerCount, 1)
    assert.equal(rec.matchingProfileId, 'cap-10devices-1workers')
    assert.equal(rec.kernels, 1)
    assert.equal(rec.gateways, 1)
  })

  it('returns unmeasured for a family the envelope does not have', () => {
    const rec = sizeSite(parseSiteDescription('A handful of Avalon miners on an SD-card Raspberry Pi.'), envelope)
    assert.equal(rec.status, 'unmeasured')
    const result = matchRecommendation(rec, { status: 'unmeasured', tier: 'edge' })
    assert.equal(result.ok, true, result.errors.join('; '))
  })
})
