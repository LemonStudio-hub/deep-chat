import type { Conversation, ChatMessage, DeepSeekModel } from '@deep-chat/shared'

const STORAGE_KEY = 'deep-chat-conversations'

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
}

export function createConversation(model: DeepSeekModel = 'deepseek-chat'): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    messages: [],
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function generateTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'New Chat'
  const text = firstUser.content.slice(0, 50)
  return text.length < firstUser.content.length ? text + '…' : text
}
