import { useState, useRef, useEffect } from 'react'
import { Send, Square, CornerDownLeft } from 'lucide-react'

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

  const hasContent = value.trim().length > 0

  return (
    <div className="p-4 lg:pb-5">
      <div className="max-w-3xl mx-auto relative">
        <div
          className={`glass rounded-2xl flex items-end gap-2 p-2 transition-all duration-300 ${
            hasContent ? 'ring-1 ring-accent/[0.12] shadow-glow-sm' : ''
          }`}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none px-3 py-2 text-[14px] text-zinc-100 placeholder:text-zinc-600 outline-none max-h-[200px] leading-[1.6] selection:bg-accent/20"
          />

          <div className="flex items-center gap-1.5 pb-0.5">
            {!isLoading && !hasContent && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-700 mr-1">
                <CornerDownLeft size={11} />
                Enter
              </span>
            )}
            <button
              onClick={handleSend}
              disabled={(!value.trim() && !isLoading) || disabled}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isLoading
                  ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 ring-1 ring-red-500/20 animate-glow-pulse'
                  : hasContent
                    ? 'bg-gradient-to-br from-accent/20 to-accent/10 text-accent hover:from-accent/25 hover:to-accent/15 ring-1 ring-accent/20 shadow-glow-sm hover:scale-105 active:scale-95'
                    : 'bg-white/[0.04] text-zinc-700 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Square size={14} /> : <Send size={14} className={hasContent ? '' : ''} />}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-700 mt-2.5 italic">
          DeepSeek can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  )
}
