import { describe, expect, it } from 'vitest'

import { describeAgentError, GENERIC_TURN_ERROR } from './error-text'
import { ERR_STREAM_IDLE } from './sse'
import { AGENT_ERROR } from './transport'

describe('describeAgentError', () => {
  it('turns a producer code into a sentence', () => {
    // The reducer stores whatever the `error` event carried, which is a bare code.
    expect(describeAgentError(AGENT_ERROR.UNAVAILABLE)).toBe(
      'The agent is not configured on this gateway.',
    )
    expect(describeAgentError(ERR_STREAM_IDLE)).toMatch(/stopped responding/)
  })

  it('generalises a code this release has never seen', () => {
    expect(describeAgentError('ERR_AGENT_SOMETHING_NEW')).toBe(GENERIC_TURN_ERROR)
  })

  it('passes prose through, since the hook already writes some', () => {
    expect(describeAgentError('The agent could not complete that request.')).toBe(
      'The agent could not complete that request.',
    )
  })

  it('has nothing to say about no error', () => {
    expect(describeAgentError(null)).toBeNull()
  })
})
