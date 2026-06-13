import { useEffect, useRef } from 'react'
import type { ChatMessage, DeepSeekModel, ConnectionState } from '@deep-chat/shared'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import WelcomeScreen from './WelcomeScreen'
import ModelSelector from './ModelSelector'
import ConnectionStatus from './ConnectionStatus'
import { AlertCircle, Menu } from 'lucide-react'

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  connectionState: ConnectionState
  model: DeepSeekModel
  onModelChange: (model: DeepSeekModel) => void
  onSend: (content: string) => void
  onStop: () => void
  onMenuOpen: () => void
}

export default function ChatArea({ messages, isLoading, error, connectionState, model, onModelChange, onSend, onStop, onMenuOpen }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex-1 flex flex-col min-h-0 relative z-10">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-white/[0.04] bg-surface-0/70 backdrop-blur-xl shadow-sm shadow-black/10">
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-2 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Menu size={18} />
        </button>
        <ModelSelector value={model} onChange={onModelChange} />
        <div className="flex-1" />
        <ConnectionStatus state={connectionState} />
      </header>

      {/* Messages */}
      {messages.length === 0 ? (
        <WelcomeScreen onSuggestion={onSend} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
          {/* Top fade for scroll indication */}
          <div className="sticky top-0 h-6 bg-gradient-to-b from-surface-0 to-transparent z-10 pointer-events-none" />

          <div className="max-w-3xl mx-auto px-4 lg:px-0 pb-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant' && !msg.content}
              />
            ))}

            {error && (
              <div className="mx-4 my-3 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/10 text-red-400 text-sm animate-slide-up">
                <div className="w-1 h-full min-h-[20px] rounded-full bg-red-500/40 flex-shrink-0 mt-0.5" />
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
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
