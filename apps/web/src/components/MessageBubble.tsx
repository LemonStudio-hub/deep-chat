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
    <div className={`flex gap-4 px-4 py-5 animate-fade-in ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <Bot size={18} className="text-accent" />
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-accent/15 text-white ml-auto'
            : 'bg-surface-2 text-gray-200'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : message.content ? (
          <MarkdownRenderer content={message.content} />
        ) : isStreaming ? (
          <TypingIndicator />
        ) : null}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <User size={18} className="text-gray-400" />
        </div>
      )}
    </div>
  )
}
