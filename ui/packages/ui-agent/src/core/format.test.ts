import { describe, expect, it } from 'vitest'

import { formatClock, formatConversationMeta, formatDay, formatMessageCount } from './format'

const NOW = new Date('2026-08-13T14:32:00').getTime()

describe('formatDay', () => {
  it('names today and yesterday rather than dating them', () => {
    expect(formatDay(NOW, NOW)).toBe('Today')
    expect(formatDay(NOW - 86_400_000, NOW)).toBe('Yesterday')
  })

  it('crosses midnight by calendar day, not by elapsed hours', () => {
    const justAfterMidnight = new Date('2026-08-13T00:10:00').getTime()
    const lateYesterday = new Date('2026-08-12T23:50:00').getTime()

    expect(formatDay(lateYesterday, justAfterMidnight)).toBe('Yesterday')
  })

  it('dates anything older', () => {
    expect(formatDay(new Date('2026-07-28T11:02:00').getTime(), NOW)).toMatch(/Jul/)
  })
})

describe('formatClock', () => {
  it('is 24-hour so the column lines up in a monospace list', () => {
    expect(formatClock(NOW)).toBe('14:32')
  })
})

describe('formatMessageCount', () => {
  it.each([
    [1, '1 message'],
    [6, '6 messages'],
    [0, '0 messages'],
  ])('%d -> %s', (count, expected) => {
    expect(formatMessageCount(count)).toBe(expected)
  })
})

describe('formatConversationMeta', () => {
  it('reads as one line, as the design lists it', () => {
    expect(formatConversationMeta(NOW, 6, NOW)).toBe('Today · 14:32 · 6 messages')
  })
})
