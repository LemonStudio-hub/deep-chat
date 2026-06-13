import { useState, useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'

interface Props {
  onSend: (message: string) => void
  onStop: () => void
  isLoading: boolean
  disabled?: boolean
}

export default function ChatInput({ onSend, onStop, isLoading, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }, [value])

  const handleSend = () => {
    if (isLoading) {
      onStop()
      return
    }
    if (!value.trim() || disabled) return
    onSend(value)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-4">
      <div className="max-w-3xl mx-auto relative">
        <div className="glass rounded-2xl flex items-end gap-2 p-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none px-3 py-2 text-sm text-white placeholder-gray-500 outline-none max-h-[200px]"
          />
          <button
            onClick={handleSend}
            disabled={(!value.trim() && !isLoading) || disabled}
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isLoading
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : value.trim()
                  ? 'bg-accent/20 text-accent hover:bg-accent/30'
                  : 'bg-white/5 text-gray-600'
            }`}
          >
            {isLoading ? <Square size={16} /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">
          DeepSeek can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  )
}
