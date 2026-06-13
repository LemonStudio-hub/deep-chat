import { useState, useCallback, useEffect } from 'react'
import type { DeepSeekModel } from '@deep-chat/shared'
import type { ConversationMeta } from '../lib/storage'
import { loadConversations, saveConversations, createConversation, generateTitle } from '../lib/storage'

export interface UseConversationsReturn {
  conversations: ConversationMeta[]
  activeId: string | null
  activeConversation: ConversationMeta | undefined
  createNew: (model?: DeepSeekModel) => string
  switchTo: (id: string) => void
  deleteConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
  autoTitle: (id: string, firstMessage: string) => void
  updateModel: (id: string, model: DeepSeekModel) => void
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationMeta[]>(() => loadConversations())
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

  const renameConversation = useCallback((id: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c)),
    )
  }, [])

  const autoTitle = useCallback((id: string, firstMessage: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id && c.title === 'New Chat'
          ? { ...c, title: generateTitle(firstMessage), updatedAt: Date.now() }
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
    renameConversation,
    autoTitle,
    updateModel,
  }
}
