import type { DeepSeekModel } from '@deep-chat/shared'

const STORAGE_KEY = 'deep-chat-conversations'

/** Lightweight metadata stored in localStorage. Messages live in the DO. */
export interface ConversationMeta {
  id: string
  title: string
  model: DeepSeekModel
  createdAt: number
  updatedAt: number
}

export function loadConversations(): ConversationMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    // Migrate old format (with messages array) to new lightweight format
    return parsed.map((c: any) => ({
      id: c.id,
      title: c.title || 'New Chat',
      model: c.model || 'deepseek-chat',
      createdAt: c.createdAt || Date.now(),
      updatedAt: c.updatedAt || Date.now(),
    }))
  } catch {
    return []
  }
}

export function saveConversations(conversations: ConversationMeta[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
}

export function createConversation(model: DeepSeekModel = 'deepseek-chat'): ConversationMeta {
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function generateTitle(firstMessage: string): string {
  const text = firstMessage.slice(0, 50).trim()
  return text.length < firstMessage.length ? text + '…' : text || 'New Chat'
}
