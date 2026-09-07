import { describe, expect, it } from 'vitest'

import { isSmallTalk } from './small-talk'

describe('isSmallTalk', () => {
  it.each([
    'Hey what\'s up?',
    'hi',
    'Hello there',
    'Good morning',
    'thanks!',
    'Thank you, that helps',
    'ok cool',
    'bye',
    'What can you do?',
    'who are you',
    'How are you?',
    'Hey there 👋',
  ])('treats %j as conversation', (text) => {
    expect(isSmallTalk(text)).toBe(true)
  })

  it.each([
    'How many miners are there?',
    'hey, list the devices',
    'thanks — now show me the offline ones',
    'Hi, is the site ok?',
    'Reboot miner-001',
    'What is the hashrate?',
  ])('treats %j as a fleet request', (text) => {
    expect(isSmallTalk(text)).toBe(false)
  })

  it('does not read a long message as a greeting because of how it opens', () => {
    expect(isSmallTalk('hey I need to know whether everything is fine before I leave')).toBe(false)
  })

  it('is false for an empty message', () => {
    expect(isSmallTalk('   ')).toBe(false)
  })

  it('reads a typographic apostrophe the same as a plain one', () => {
    expect(isSmallTalk('what’s up')).toBe(true)
  })
})
