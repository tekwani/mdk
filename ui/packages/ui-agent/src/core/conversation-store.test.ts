import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage, Conversation, ConversationStorage } from './conversation-store'
import { TOOL_STATUS } from './turn'
import {
  createConversationStore,
  deriveTitle,
  MAX_MESSAGES_PER_CONVERSATION,
  MAX_PERSISTED_TOOL_TEXT_CHARS,
  mergeConversations,
  MESSAGE_ROLE,
} from './conversation-store'

function memoryStorage(seed?: string): ConversationStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  if (seed !== undefined) data.set('key', seed)
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

function userMessage(text: string, at = 1000): ChatMessage {
  return { id: crypto.randomUUID(), role: MESSAGE_ROLE.USER, text, at }
}

let storage: ReturnType<typeof memoryStorage>

beforeEach(() => {
  storage = memoryStorage()
})

function store() {
  return createConversationStore({ storage, storageKey: 'key' })
}

describe('deriveTitle', () => {
  it('takes the first line of the first message', () => {
    expect(deriveTitle('How is the site doing?\nand also the pool')).toBe('How is the site doing?')
  })

  it('truncates a long question with an ellipsis', () => {
    expect(deriveTitle('x'.repeat(80))).toHaveLength(48)
  })

  it('falls back for an empty message', () => {
    expect(deriveTitle('   ')).toBe('New conversation')
  })
})

describe('createConversationStore', () => {
  it('creates a conversation and makes it active', () => {
    const api = store()
    const id = api.getState().create('c1', 1000)

    expect(api.getState().activeId).toBe(id)
    expect(api.getState().conversations).toHaveLength(1)
  })

  it('titles a conversation from its first operator message', () => {
    const api = store()
    api.getState().create('c1', 1000)
    api.getState().appendMessage('c1', userMessage('How many miners are there?'))

    expect(api.getState().conversations[0]?.title).toBe('How many miners are there?')
  })

  it('does not retitle on later messages', () => {
    const api = store()
    api.getState().create('c1', 1000)
    api.getState().appendMessage('c1', userMessage('first'))
    api.getState().appendMessage('c1', userMessage('second', 2000))

    expect(api.getState().conversations[0]?.title).toBe('first')
  })

  it('orders conversations newest first', () => {
    const api = store()
    api.getState().create('older', 1000)
    api.getState().create('newer', 2000)
    api.getState().appendMessage('older', userMessage('bump', 3000))

    expect(api.getState().conversations.map((conversation) => conversation.id)).toEqual([
      'older',
      'newer',
    ])
  })

  it('caps a transcript at the agent\'s own per-session ceiling', () => {
    const api = store()
    api.getState().create('c1', 1000)
    for (let index = 0; index < MAX_MESSAGES_PER_CONVERSATION + 10; index += 1) {
      api.getState().appendMessage('c1', userMessage(`m${index}`, 1000 + index))
    }

    expect(api.getState().conversations[0]?.messages).toHaveLength(MAX_MESSAGES_PER_CONVERSATION)
  })

  it('moves the active id when the active conversation is removed', () => {
    const api = store()
    api.getState().create('c1', 1000)
    api.getState().create('c2', 2000)
    api.getState().remove('c2')

    expect(api.getState().activeId).toBe('c1')
  })

  it('ignores selecting a conversation that does not exist', () => {
    const api = store()
    api.getState().create('c1', 1000)
    api.getState().select('nope')

    expect(api.getState().activeId).toBe('c1')
  })

  it('records the session id so a reload can resume the same server session', () => {
    const api = store()
    api.getState().create('c1', 1000)
    api.getState().setSessionId('c1', 'sess-1')

    expect(api.getState().conversations[0]?.sessionId).toBe('sess-1')
  })
})

describe('persistence', () => {
  it('reads a transcript back after a reload', () => {
    const first = store()
    first.getState().create('c1', 1000)
    first.getState().appendMessage('c1', userMessage('How is the site doing?'))

    const second = store()
    expect(second.getState().conversations[0]?.messages).toHaveLength(1)
    expect(second.getState().activeId).toBe('c1')
  })

  it('discards a corrupt payload rather than booting into a broken state', () => {
    const api = createConversationStore({ storage: memoryStorage('not json'), storageKey: 'key' })
    expect(api.getState().conversations).toEqual([])
  })

  it('drops entries that do not look like conversations', () => {
    const seeded = memoryStorage(JSON.stringify({ conversations: [{ nope: true }], activeId: 'x' }))
    const api = createConversationStore({ storage: seeded, storageKey: 'key' })

    expect(api.getState().conversations).toEqual([])
    expect(api.getState().activeId).toBeNull()
  })

  it('drops an activeId that names a conversation that is gone', () => {
    const seeded = memoryStorage(
      JSON.stringify({
        conversations: [{ id: 'c1', title: 't', sessionId: null, messages: [], createdAt: 1, updatedAt: 1 }],
        activeId: 'missing',
      }),
    )
    const api = createConversationStore({ storage: seeded, storageKey: 'key' })

    expect(api.getState().activeId).toBeNull()
  })

  it('keeps working when storage is unavailable', () => {
    const api = createConversationStore({ storage: null })
    api.getState().create('c1', 1000)

    expect(api.getState().conversations).toHaveLength(1)
  })

  it('keeps the conversation going when a write fails on quota', () => {
    const failing: ConversationStorage = {
      getItem: () => null,
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError')
      }),
    }
    const api = createConversationStore({ storage: failing, storageKey: 'key' })

    expect(() => api.getState().create('c1', 1000)).not.toThrow()
    expect(api.getState().conversations).toHaveLength(1)
  })
})

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    title: 't',
    sessionId: null,
    messages: [],
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  }
}

describe('mergeConversations', () => {
  it('keeps whichever copy was updated last', () => {
    const mine = [conversation({ id: 'c1', updatedAt: 2_000, title: 'mine' })]
    const theirs = [conversation({ id: 'c1', updatedAt: 3_000, title: 'theirs' })]

    expect(mergeConversations(mine, theirs)[0]?.title).toBe('theirs')
    expect(mergeConversations(theirs, mine)[0]?.title).toBe('theirs')
  })

  it('keeps conversations only one side has', () => {
    const merged = mergeConversations(
      [conversation({ id: 'a' })],
      [conversation({ id: 'b', updatedAt: 2_000 })],
    )

    expect(merged.map((entry) => entry.id)).toEqual(['b', 'a'])
  })
})

describe('two tabs', () => {
  const KEY = 'mdk-ui-agent:test:conversations'

  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  function tab() {
    return createConversationStore({ storage: globalThis.localStorage, storageKey: KEY })
  }

  /** What the browser dispatches in every *other* tab after a write. */
  function announceWrite() {
    globalThis.dispatchEvent(
      new StorageEvent('storage', {
        key: KEY,
        newValue: globalThis.localStorage.getItem(KEY),
      }),
    )
  }

  it('merges the other tab\'s turns instead of overwriting them', () => {
    // Both tabs write the whole snapshot, so without a merge the one that acts last
    // replaces the other's transcript — and the gateway keeps no copy of it.
    const first = tab()
    const second = tab()

    first.getState().create('c1', 1_000)
    first.getState().appendMessage('c1', userMessage('from the first tab', 2_000))
    announceWrite()

    second.getState().create('c2', 3_000)
    announceWrite()

    expect(first.getState().conversations.map((entry) => entry.id).sort()).toEqual(['c1', 'c2'])
    expect(second.getState().conversations.find((entry) => entry.id === 'c1')?.messages)
      .toHaveLength(1)
  })

  it('leaves this tab\'s own active conversation alone', () => {
    const first = tab()
    first.getState().create('mine', 1_000)
    const second = tab()
    second.getState().create('theirs', 2_000)
    announceWrite()

    expect(first.getState().activeId).toBe('mine')
  })

  it('ignores a write to another key', () => {
    const api = tab()
    api.getState().create('c1', 1_000)

    globalThis.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }))

    expect(api.getState().conversations).toHaveLength(1)
  })
})

describe('what is written', () => {
  it('caps a tool result in storage but not in memory', () => {
    // `list_devices` on a real fleet is the whole fleet serialized, and it would be
    // rewritten on every later change.
    const long = 'x'.repeat(MAX_PERSISTED_TOOL_TEXT_CHARS + 500)
    const api = store()
    api.getState().create('c1', 1_000)
    api.getState().appendMessage('c1', {
      id: 'm1',
      role: MESSAGE_ROLE.ASSISTANT,
      text: 'done',
      at: 1_000,
      tools: [{ id: 't:0', name: 'list_devices', args: {}, status: TOOL_STATUS.OK, startedAt: 0, text: long }],
    })

    expect(api.getState().conversations[0]?.messages[0]?.tools?.[0]?.text).toHaveLength(long.length)
    expect(storage.data.get('key')!.length).toBeLessThan(long.length)
  })

  it('does not write again when nothing changed', () => {
    const writes = vi.fn()
    const counting: ConversationStorage = {
      getItem: () => null,
      setItem: writes,
    }
    const api = createConversationStore({ storage: counting, storageKey: 'key' })

    api.getState().create('c1', 1_000)
    api.getState().select('c1')
    api.getState().select('c1')

    expect(writes).toHaveBeenCalledTimes(1)
  })
})
