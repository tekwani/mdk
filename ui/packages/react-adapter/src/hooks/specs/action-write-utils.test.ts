import {
  buildRebootAction,
  buildSetPowerModeAction,
  POWER_MODE,
} from '@tetherto/mdk-ui-foundation'
import { describe, expect, it } from 'vitest'

import { extractSubmitError, toVotingPayload } from '../action-write-utils'

describe('toVotingPayload', () => {
  it('builds the query from a device action\'s tags and drops queue-only fields', () => {
    const submission = buildSetPowerModeAction(['id-miner-1', 'id-miner-2'], POWER_MODE.SLEEP, {
      type: 'container',
      params: { containers: ['bitdeer-1a'] },
    })

    const payload = toVotingPayload({ id: 1, ...submission })

    // Targeting is expressed only through `query`; tags/crossThing/type never
    // reach the API body (the gateway schema requires `query` and rejects the rest).
    expect(payload).toEqual({
      action: 'setPowerMode',
      params: ['sleep'],
      query: { tags: { $in: ['id-miner-1', 'id-miner-2'] } },
    })
    expect('tags' in payload).toBe(false)
    expect('crossThing' in payload).toBe(false)
  })

  it('keeps an explicit query when the action opts out with overrideQuery: false', () => {
    const payload = toVotingPayload({
      id: 2,
      action: 'setupPools',
      params: [{ type: 'pool' }],
      query: { id: { $in: ['miner-1', 'miner-2'] } },
      overrideQuery: false,
      tags: ['id-miner-1'],
      codesList: ['WM-M56S-0001'],
      poolName: 'TestPool',
    })

    expect(payload).toEqual({
      action: 'setupPools',
      params: [{ type: 'pool' }],
      query: { id: { $in: ['miner-1', 'miner-2'] } },
    })
  })

  it('emits an empty-tags query when the action has neither query nor tags', () => {
    const payload = toVotingPayload({ id: 3, action: 'forgetThings', params: [{ rackId: 'r1' }] })

    expect(payload.query).toEqual({ tags: { $in: [] } })
  })

  it('rebuilds the query from tags when overrideQuery is not explicitly false', () => {
    const payload = toVotingPayload({ id: 4, ...buildRebootAction(['id-miner-2']) })

    expect(payload.query).toEqual({ tags: { $in: ['id-miner-2'] } })
    expect(payload.action).toBe('reboot')
    expect('tags' in payload).toBe(false)
  })

  it('preserves rackType and drops the local queue id', () => {
    const payload = toVotingPayload({
      id: 9,
      action: 'setPowerPct',
      params: ['85'],
      tags: ['id-miner-1'],
      rackType: 'miner',
    })

    expect(payload.rackType).toBe('miner')
    expect('id' in payload).toBe(false)
  })
})

describe('extractSubmitError', () => {
  it('returns null for clean responses', () => {
    expect(extractSubmitError([{ id: 1 }])).toBeNull()
    expect(extractSubmitError([])).toBeNull()
    expect(extractSubmitError(undefined)).toBeNull()
  })

  it('surfaces embedded errors from 200 responses', () => {
    expect(extractSubmitError([{ errors: ['ERR_SOMETHING'] }])).toBe('ERR_SOMETHING')
  })
})
