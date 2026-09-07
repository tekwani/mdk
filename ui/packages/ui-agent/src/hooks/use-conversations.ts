import type { StoreApi } from 'zustand/vanilla'
import { useMemo } from 'react'
import { useStore } from 'zustand'

import type { Conversation, ConversationStore } from '../core/conversation-store'
import { conversationStore as defaultStore } from '../core/conversation-store'

export type UseConversationsResult = {
  /** Newest first — the order the Conversations view renders. */
  conversations: Conversation[]
  active: Conversation | null
  activeId: string | null
  create: ConversationStore['create']
  select: ConversationStore['select']
  remove: ConversationStore['remove']
}

/**
 * Binds the conversation store to React.
 *
 * Takes a store instance so tests and the catalog demo can run against an
 * isolated one; runtime callers get the module singleton.
 */
export function useConversations(
  store: StoreApi<ConversationStore> = defaultStore,
): UseConversationsResult {
  const conversations = useStore(store, (state) => state.conversations)
  const activeId = useStore(store, (state) => state.activeId)
  const create = useStore(store, (state) => state.create)
  const select = useStore(store, (state) => state.select)
  const remove = useStore(store, (state) => state.remove)

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  )

  return { conversations, active, activeId, create, select, remove }
}
