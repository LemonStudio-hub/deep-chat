import { useState, useCallback, useEffect } from 'react'
import type { Conversation, ChatMessage, DeepSeekModel } from '@deep-chat/shared'
import { loadConversations, saveConversations, createConversation, generateTitle } from '../lib/storage'

export interface UseConversationsReturn {
  conversations: Conversation[]
  activeId: string | null
  activeConversation: Conversation | undefined
  createNew: (model?: DeepSeekModel) => string
  switchTo: (id: string) => void
  deleteConversation: (id: string) => void
  updateMessages: (id: string, messages: ChatMessage[]) => void
  updateModel: (id: string, model: DeepSeekModel) => void
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations())
  const [activeId, setActiveId] = useState<string | null>(() => {
    const saved = loadConversations()
    return saved.length > 0 ? saved[0].id : null
  })

  // Persist to localStorage on change
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  const createNew = useCallback(
    (model: DeepSeekModel = 'deepseek-chat') => {
      const conv = createConversation(model)
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)
      return conv.id
    },
    [],
  )

  const switchTo = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id)
        if (activeId === id) {
          setActiveId(next.length > 0 ? next[0].id : null)
        }
        return next
      })
    },
    [activeId],
  )

  const updateMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              messages,
              title: c.title === 'New Chat' && messages.length > 0 ? generateTitle(messages) : c.title,
              updatedAt: Date.now(),
            }
          : c,
      ),
    )
  }, [])

  const updateModel = useCallback((id: string, model: DeepSeekModel) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, model, updatedAt: Date.now() } : c)))
  }, [])

  const activeConversation = conversations.find((c) => c.id === activeId)

  return {
    conversations,
    activeId,
    activeConversation,
    createNew,
    switchTo,
    deleteConversation,
    updateMessages,
    updateModel,
  }
}
