/**
 * Conversation history, persisted client-side.
 *
 * The gateway keeps sessions in an in-memory `Map` per process — no titles, no
 * timestamps, no transcripts, and nothing survives a restart — and exposes no
 * route to list them. So the Conversations view is backed from here instead.
 *
 * A stored `sessionId` is therefore a weak reference: it 404s after a gateway
 * restart or once the agent's own 30-minute session TTL lapses. That is expected,
 * not an error — the transcript still reads back, and the next message mints a
 * fresh session (see `useAgentChat`).
 */

import { createStore } from 'zustand/vanilla'
import type { StoreApi } from 'zustand/vanilla'

import type { ToolStep } from './turn'
import { uuid } from './uuid'

export const CONVERSATION_STORAGE_KEY = 'mdk-ui-agent:conversations:v1'

/** Keeps localStorage bounded. The oldest conversations fall off the end. */
export const MAX_CONVERSATIONS = 50
/** Mirrors the agent's own per-session ceiling in `backend/core/agent/src/session-store.js`. */
export const MAX_MESSAGES_PER_CONVERSATION = 200
/**
 * How much of a tool result is kept in storage.
 *
 * A `list_devices` result is the whole fleet serialized, and it is written again on
 * every subsequent change. The full text stays in memory for the session — this is
 * only what survives a reload, where the chip's tooltip is a convenience and the
 * quota is not. Mirrors `HISTORY_RESULT_CHARS` in the producer's own transcript.
 */
export const MAX_PERSISTED_TOOL_TEXT_CHARS = 400

export const MESSAGE_ROLE = {
  USER: 'user',
  ASSISTANT: 'assistant',
  /** Not from the model: something the panel itself has to tell the operator. */
  SYSTEM: 'system',
} as const

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE]

export type ChatMessage = {
  id: string
  role: MessageRole
  text: string
  at: number
  /** Assistant only: the tool chips for this turn, in call order. */
  tools?: ToolStep[]
  /** Assistant only: set when the turn ended on an `error` event. Raw `ERR_*` codes included. */
  error?: string | null
  /**
   * Assistant only: the turn was stopped before it finished — by the operator, or
   * by the panel unmounting. Whatever streamed is kept, but it is not the whole
   * answer and must not read back as one.
   */
  interrupted?: boolean
}

export type Conversation = {
  id: string
  title: string
  /** Null until the first turn creates one, or after a stale one is discarded. */
  sessionId: string | null
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export type ConversationState = {
  conversations: Conversation[]
  activeId: string | null
}

export type ConversationActions = {
  create: (id?: string, at?: number) => string
  select: (id: string) => void
  remove: (id: string) => void
  setSessionId: (id: string, sessionId: string | null) => void
  appendMessage: (id: string, message: ChatMessage) => void
  updateMessage: (id: string, messageId: string, patch: Partial<ChatMessage>) => void
  reset: () => void
}

export type ConversationStore = ConversationState & ConversationActions

export type ConversationStorage = Pick<Storage, 'getItem' | 'setItem'>

export type ConversationStoreOptions = {
  storageKey?: string
  /** Pass `null` to disable persistence entirely (tests, SSR). */
  storage?: ConversationStorage | null
}

const initialState: ConversationState = { conversations: [], activeId: null }

/**
 * `localStorage` throws on access in some privacy modes and does not exist
 * outside the browser, so it is probed rather than assumed.
 */
function defaultStorage(): ConversationStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** First line of the first user message, which is what the design lists. */
export function deriveTitle(text: string, max = 48): string {
  const line = text.trim().split('\n')[0]?.trim() ?? ''
  if (line.length === 0) return 'New conversation'
  return line.length <= max ? line : `${line.slice(0, max - 1).trimEnd()}…`
}

export function newConversation(id: string, at: number): Conversation {
  return { id, title: 'New conversation', sessionId: null, messages: [], createdAt: at, updatedAt: at }
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Conversation>
  return typeof candidate.id === 'string' && Array.isArray(candidate.messages)
}

/**
 * Anything unreadable is discarded rather than repaired: the stored shape can
 * predate a release, and losing local history is a far better failure than
 * booting the panel into a broken state.
 */
function readPersisted(storage: ConversationStorage | null, key: string): ConversationState {
  if (!storage) return initialState
  try {
    const raw = storage.getItem(key)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<ConversationState>
    const conversations = Array.isArray(parsed.conversations)
      ? parsed.conversations.filter(isConversation)
      : []
    const activeId
      = typeof parsed.activeId === 'string'
        && conversations.some((conversation) => conversation.id === parsed.activeId)
        ? parsed.activeId
        : null
    return { conversations, activeId }
  } catch {
    return initialState
  }
}

/** Keeps a full fleet dump out of every write. The in-memory copy is untouched. */
function trimForStorage(conversation: Conversation): Conversation {
  if (!conversation.messages.some((message) => message.tools?.length)) return conversation

  return {
    ...conversation,
    messages: conversation.messages.map((message) =>
      message.tools?.length
        ? {
            ...message,
            tools: message.tools.map((step) =>
              step.text === undefined || step.text.length <= MAX_PERSISTED_TOOL_TEXT_CHARS
                ? step
                : { ...step, text: `${step.text.slice(0, MAX_PERSISTED_TOOL_TEXT_CHARS)}…` },
            ),
          }
        : message,
    ),
  }
}

function serialize(state: ConversationState): string {
  return JSON.stringify({
    conversations: state.conversations.map(trimForStorage),
    activeId: state.activeId,
  })
}

function writePersisted(storage: ConversationStorage | null, key: string, payload: string): void {
  if (!storage) return
  try {
    storage.setItem(key, payload)
  } catch {
    // Quota exceeded or storage disabled mid-session. History is a convenience,
    // never a correctness requirement, so the live conversation continues.
  }
}

function touch(conversation: Conversation, at: number): Conversation {
  return { ...conversation, updatedAt: at }
}

/** Newest first, capped — the order the Conversations view renders. */
function sortAndCap(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS)
}

/**
 * Reconciles this tab's conversations with what another tab has just written.
 *
 * Union by id, newer `updatedAt` wins. Without it the last tab to act overwrites
 * the other's turns with its own staler snapshot — and since the gateway keeps no
 * history, that is permanent loss rather than a cache miss.
 *
 * The trade-off is deliberate: a conversation deleted in one tab can come back
 * from the other tab's copy, because "absent" and "never seen" are the same thing
 * in a union. Resurrecting a transcript is the recoverable direction; losing one
 * is not.
 */
export function mergeConversations(mine: Conversation[], theirs: Conversation[]): Conversation[] {
  const byId = new Map(mine.map((conversation) => [conversation.id, conversation]))

  for (const other of theirs) {
    const own = byId.get(other.id)
    if (!own || other.updatedAt > own.updatedAt) byId.set(other.id, other)
  }

  return sortAndCap([...byId.values()])
}

/**
 * Factory for an isolated conversation store. Tests and SSR should use this;
 * runtime code binds to the singleton {@link conversationStore}.
 */
export function createConversationStore(
  options: ConversationStoreOptions = {},
): StoreApi<ConversationStore> {
  const key = options.storageKey ?? CONVERSATION_STORAGE_KEY
  const storage = options.storage === undefined ? defaultStorage() : options.storage

  const store = createStore<ConversationStore>((set, get) => ({
    ...readPersisted(storage, key),

    create: (id, at) => {
      const conversationId = id ?? uuid()
      const createdAt = at ?? Date.now()
      set((state) => ({
        conversations: sortAndCap([newConversation(conversationId, createdAt), ...state.conversations]),
        activeId: conversationId,
      }))
      return conversationId
    },

    select: (id) => {
      if (!get().conversations.some((conversation) => conversation.id === id)) return
      set({ activeId: id })
    },

    remove: (id) => {
      set((state) => {
        const conversations = state.conversations.filter((conversation) => conversation.id !== id)
        return {
          conversations,
          activeId: state.activeId === id ? (conversations[0]?.id ?? null) : state.activeId,
        }
      })
    },

    setSessionId: (id, sessionId) => {
      set((state) => ({
        conversations: state.conversations.map((conversation) =>
          conversation.id === id ? { ...conversation, sessionId } : conversation,
        ),
      }))
    },

    appendMessage: (id, message) => {
      set((state) => ({
        conversations: sortAndCap(
          state.conversations.map((conversation) => {
            if (conversation.id !== id) return conversation
            const messages = [...conversation.messages, message].slice(-MAX_MESSAGES_PER_CONVERSATION)
            const title
              = conversation.messages.length === 0 && message.role === MESSAGE_ROLE.USER
                ? deriveTitle(message.text)
                : conversation.title
            return touch({ ...conversation, messages, title }, message.at)
          }),
        ),
      }))
    },

    updateMessage: (id, messageId, patch) => {
      set((state) => ({
        conversations: state.conversations.map((conversation) => {
          if (conversation.id !== id) return conversation
          return {
            ...conversation,
            messages: conversation.messages.map((message) =>
              message.id === messageId ? { ...message, ...patch } : message,
            ),
          }
        }),
      }))
    },

    reset: () => set({ ...initialState }),
  }))

  // The last payload written or read, so an unchanged state is not written again —
  // and, with the cross-tab listener below, so two tabs cannot ping-pong identical
  // writes at each other forever.
  let persisted = serialize(store.getState())

  store.subscribe((state) => {
    const payload = serialize(state)
    if (payload === persisted) return
    persisted = payload
    writePersisted(storage, key, payload)
  })

  /**
   * Another tab wrote the same key: merge its conversations in rather than letting
   * whichever tab acts last overwrite the other.
   *
   * Only wired up for real `localStorage`, because the `storage` event describes
   * nothing else — an injected storage (tests, SSR) has no cross-tab notion at all.
   */
  if (storage && storage === globalThis.localStorage && typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('storage', (event) => {
      if (event.storageArea && event.storageArea !== globalThis.localStorage) return
      // A null key is `localStorage.clear()`, which drops ours too.
      if (event.key !== null && event.key !== key) return

      const external = readPersisted(storage, key)
      const merged = mergeConversations(store.getState().conversations, external.conversations)
      persisted = serialize({ conversations: merged, activeId: store.getState().activeId })
      // The other tab's `activeId` is about its own window, so ours is kept.
      store.setState({ conversations: merged })
    })
  }

  return store
}

/**
 * Module-level singleton holding every conversation the operator has had in this
 * browser. React subscribers bind to it through `useConversations`.
 */
export const conversationStore = createConversationStore()
