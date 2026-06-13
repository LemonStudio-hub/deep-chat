import { useState, useCallback, useEffect } from 'react'
import type { DeepSeekModel } from '@deep-chat/shared'
import { useChat } from './hooks/useChat'
import { useConversations } from './hooks/useConversations'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'

export default function App() {
  const {
    conversations,
    activeId,
    activeConversation,
    createNew,
    switchTo,
    deleteConversation,
    renameConversation,
    autoTitle,
    updateModel,
  } = useConversations()

  const chat = useChat(activeId)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // When switching conversations, load history from the Durable Object
  useEffect(() => {
    if (activeId) {
      chat.loadHistory()
    } else {
      chat.clearMessages()
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentModel: DeepSeekModel = activeConversation?.model || 'deepseek-chat'

  const handleSend = useCallback(
    (content: string) => {
      if (!activeId) {
        const newId = createNew(currentModel)
        setTimeout(() => chat.sendMessage(content, currentModel), 50)
        return
      }
      // Auto-title from first user message
      autoTitle(activeId, content)
      chat.sendMessage(content, currentModel)
    },
    [activeId, currentModel, chat.sendMessage, createNew, autoTitle],
  )

  const handleNewChat = useCallback(() => {
    chat.stopGeneration()
    chat.clearMessages()
    createNew(currentModel)
  }, [createNew, currentModel, chat.clearMessages, chat.stopGeneration])

  const handleSwitch = useCallback(
    (id: string) => {
      if (id === activeId) return
      // Stop any in-progress generation before switching
      chat.stopGeneration()
      chat.clearMessages()
      switchTo(id)
    },
    [activeId, switchTo, chat.stopGeneration, chat.clearMessages],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (id === activeId) {
        chat.stopGeneration()
      }
      deleteConversation(id)
    },
    [activeId, deleteConversation, chat.stopGeneration],
  )

  const handleModelChange = useCallback(
    (model: DeepSeekModel) => {
      if (activeId) {
        updateModel(activeId, model)
      }
    },
    [activeId, updateModel],
  )

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N → new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleNewChat()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNewChat])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isLoading={chat.isLoading}
        onNew={handleNewChat}
        onSwitch={handleSwitch}
        onDelete={handleDelete}
        onRename={renameConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ChatArea
        messages={chat.messages}
        isLoading={chat.isLoading}
        error={chat.error}
        connectionState={chat.connectionState}
        model={currentModel}
        onModelChange={handleModelChange}
        onSend={handleSend}
        onStop={chat.stopGeneration}
        onMenuOpen={() => setSidebarOpen(true)}
      />
    </div>
  )
}
