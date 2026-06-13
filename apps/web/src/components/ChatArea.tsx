import { useEffect, useRef } from 'react'
import type { ChatMessage, DeepSeekModel } from '@deep-chat/shared'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import WelcomeScreen from './WelcomeScreen'
import ModelSelector from './ModelSelector'
import { AlertCircle, Menu } from 'lucide-react'

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  model: DeepSeekModel
  onModelChange: (model: DeepSeekModel) => void
  onSend: (content: string) => void
  onStop: () => void
  onMenuOpen: () => void
}

export default function ChatArea({ messages, isLoading, error, model, onModelChange, onSend, onStop, onMenuOpen }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-surface-0/80 backdrop-blur-sm">
        <button onClick={onMenuOpen} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
          <Menu size={20} />
        </button>
        <ModelSelector value={model} onChange={onModelChange} />
      </header>

      {/* Messages */}
      {messages.length === 0 ? (
        <WelcomeScreen onSuggestion={onSend} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant' && !msg.content}
              />
            ))}

            {error && (
              <div className="mx-4 my-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={onSend} onStop={onStop} isLoading={isLoading} />
    </div>
  )
}
