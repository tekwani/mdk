import { describe, expect, it } from 'vitest'

import { clipToBoundary, unwrapWholeAnswerFence } from './markdown'

describe('unwrapWholeAnswerFence', () => {
  it('unwraps an answer the model put inside a markdown fence', () => {
    // A common quirk: asked for a formatted answer, the model returns the
    // formatting inside a fence, and the whole reply renders as one code block.
    const wrapped = ['```markdown', '## Site', '- 8 miners', '```'].join('\n')

    expect(unwrapWholeAnswerFence(wrapped)).toBe('## Site\n- 8 miners')
  })

  it('accepts the ```md spelling, in any case', () => {
    expect(unwrapWholeAnswerFence('```MD\nhello\n```')).toBe('hello')
  })

  it('leaves an ordinary code fence alone', () => {
    const code = '```json\n{"count": 8}\n```'
    expect(unwrapWholeAnswerFence(code)).toBe(code)
  })

  it('leaves an unclosed fence alone, which is every fence mid-stream', () => {
    const partial = '```markdown\n## Site'
    expect(unwrapWholeAnswerFence(partial)).toBe(partial)
  })

  it('leaves a fence with prose after it alone', () => {
    // Then the fence is part of the answer, not a wrapper around it.
    const mixed = '```markdown\n## Site\n```\n\nAnything else?'
    expect(unwrapWholeAnswerFence(mixed)).toBe(mixed)
  })
})

describe('clipToBoundary', () => {
  it('returns short text unchanged', () => {
    expect(clipToBoundary('a short answer', 100)).toBe('a short answer')
  })

  it('cuts on the last paragraph break before the limit', () => {
    // Cutting mid-fence or mid-table row would make the preview render as
    // something the answer never said.
    const text = `${'a'.repeat(30)}\n\n${'b'.repeat(30)}\n\n${'c'.repeat(30)}`

    expect(clipToBoundary(text, 70)).toBe(`${'a'.repeat(30)}\n\n${'b'.repeat(30)}`)
  })

  it('falls back to a line break, then to the raw limit', () => {
    expect(clipToBoundary(`${'a'.repeat(30)}\n${'b'.repeat(30)}`, 40)).toBe('a'.repeat(30))
    expect(clipToBoundary('a'.repeat(60), 40)).toHaveLength(40)
  })
})
