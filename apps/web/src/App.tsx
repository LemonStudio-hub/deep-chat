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

  const currentModel: DeepSeekModel = activeConversation?.model || 'deepseek-chat'

  const handleSend = useCallback(
    (content: string) => {
      if (!activeId) {
        const newId = createNew(currentModel)
        setTimeout(() => chat.sendMessage(content, currentModel), 50)
        return
      }
      autoTitle(activeId, content)
      chat.sendMessage(content, currentModel)
    },
    [activeId, currentModel, chat.sendMessage, createNew, autoTitle],
  )

  const handleNewChat = useCallback(() => {
    createNew(currentModel)
    // useChat will reset state when activeId changes
  }, [createNew, currentModel])

  const handleSwitch = useCallback(
    (id: string) => {
      if (id === activeId) return
      switchTo(id)
      // useChat will close old socket, bump generation, load history
    },
    [activeId, switchTo],
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteConversation(id)
      // useChat will handle cleanup if the deleted conversation was active
    },
    [deleteConversation],
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
