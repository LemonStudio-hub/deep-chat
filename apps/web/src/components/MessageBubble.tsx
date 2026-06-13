import type { ChatMessage } from '@deep-chat/shared'
import { Bot, User } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'
import TypingIndicator from './TypingIndicator'

interface Props {
  message: ChatMessage
  isStreaming?: boolean
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3.5 px-4 lg:px-0 py-4 animate-slide-up ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-white/[0.06] flex items-center justify-center mt-0.5">
          <Bot size={16} className="text-accent" />
        </div>
      )}

      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 relative ${
          isUser
            ? 'bg-gradient-to-br from-accent/[0.12] to-accent/[0.06] text-white ring-1 ring-accent/[0.08] ml-auto'
            : 'bg-surface-2/80 text-zinc-200 ring-1 ring-white/[0.04]'
        } ${isStreaming ? 'shimmer' : ''}`}
      >
        {/* Subtle accent line for assistant messages */}
        {!isUser && (
          <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-accent/30 to-transparent" />
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap leading-[1.7] text-[14px]">{message.content}</p>
        ) : message.content ? (
          <div className="pl-2">
            <MarkdownRenderer content={message.content} />
          </div>
        ) : isStreaming ? (
          <TypingIndicator />
        ) : null}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/[0.06] ring-1 ring-white/[0.06] flex items-center justify-center mt-0.5">
          <User size={16} className="text-zinc-500" />
        </div>
      )}
    </div>
  )
}
