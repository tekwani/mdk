import { describe, expect, it } from 'vitest'

import { parseLeakedToolCall } from './prose'

describe('parseLeakedToolCall', () => {
  it('catches the fenced tool call the loop misclassifies as prose', () => {
    // The observed failure: the model wraps its JSON in a ```json fence, so the
    // first character is a backtick rather than `{`, the producer classifies the
    // reply as prose, and the raw call reaches the operator as the answer.
    const text = '```json\n{"tool": "count_devices", "args": {"family": "miner"}}\n```'

    expect(parseLeakedToolCall(text)).toEqual({
      tool: 'count_devices',
      args: { family: 'miner' },
    })
  })

  it('catches a bare tool call with no fence', () => {
    expect(parseLeakedToolCall('  {"tool":"summarize_site","args":{}}  ')).toEqual({
      tool: 'summarize_site',
      args: {},
    })
  })

  it('defaults missing args to an empty object', () => {
    expect(parseLeakedToolCall('{"tool":"summarize_site"}')).toEqual({
      tool: 'summarize_site',
      args: {},
    })
  })

  it('leaves a real answer alone', () => {
    expect(parseLeakedToolCall('There are 8 miners, all online.')).toBeNull()
  })

  it('leaves an answer that merely quotes JSON alone', () => {
    const text = 'The device returned {"status":"QUEUED"} which means it accepted the command.'
    expect(parseLeakedToolCall(text)).toBeNull()
  })

  it('ignores JSON with no tool key — that is data, not a call', () => {
    expect(parseLeakedToolCall('{"summary":"8 miners.","count":8}')).toBeNull()
  })

  it('is not fooled by a brace inside a string literal', () => {
    expect(parseLeakedToolCall('{"tool":"get_device","args":{"ref":"a}b"}}')).toEqual({
      tool: 'get_device',
      args: { ref: 'a}b' },
    })
  })

  it('returns null for an unbalanced object rather than throwing', () => {
    expect(parseLeakedToolCall('{"tool":"get_device"')).toBeNull()
  })

  it('returns null for empty text', () => {
    expect(parseLeakedToolCall('')).toBeNull()
  })
})
