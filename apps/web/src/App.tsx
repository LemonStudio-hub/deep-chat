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
    updateMessages,
    updateModel,
  } = useConversations()

  const chat = useChat()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sync chat messages with active conversation
  useEffect(() => {
    if (activeConversation) {
      chat.setMessages(activeConversation.messages)
    } else {
      chat.clearMessages()
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save messages back to conversation when they change
  useEffect(() => {
    if (activeId && chat.messages.length > 0) {
      updateMessages(activeId, chat.messages)
    }
  }, [chat.messages]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentModel: DeepSeekModel = activeConversation?.model || 'deepseek-chat'

  const handleSend = useCallback(
    (content: string) => {
      if (!activeId) {
        const newId = createNew(currentModel)
        // Small delay to let state settle
        setTimeout(() => chat.sendMessage(content, currentModel), 50)
        return
      }
      chat.sendMessage(content, currentModel)
    },
    [activeId, currentModel, chat.sendMessage, createNew],
  )

  const handleNewChat = useCallback(() => {
    chat.clearMessages()
    createNew(currentModel)
  }, [createNew, currentModel, chat.clearMessages])

  const handleModelChange = useCallback(
    (model: DeepSeekModel) => {
      if (activeId) {
        updateModel(activeId, model)
      }
    },
    [activeId, updateModel],
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onNew={handleNewChat}
        onSwitch={switchTo}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ChatArea
        messages={chat.messages}
        isLoading={chat.isLoading}
        error={chat.error}
        model={currentModel}
        onModelChange={handleModelChange}
        onSend={handleSend}
        onStop={chat.stopGeneration}
        onMenuOpen={() => setSidebarOpen(true)}
      />
    </div>
  )
}
