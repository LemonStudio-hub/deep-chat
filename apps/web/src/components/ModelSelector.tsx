import type { DeepSeekModel } from '@deep-chat/shared'
import { ChevronDown, Sparkles, Brain, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Props {
  value: DeepSeekModel
  onChange: (model: DeepSeekModel) => void
}

const MODELS: { id: DeepSeekModel; name: string; icon: typeof Sparkles; description: string }[] = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat', icon: Sparkles, description: 'Fast & general' },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', icon: Brain, description: 'Deep reasoning' },
]

export default function ModelSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = MODELS.find((m) => m.id === value) || MODELS[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass glass-hover glass-active text-sm text-zinc-300 transition-all duration-200 shadow-sm shadow-black/10"
      >
        <selected.icon size={14} className="text-accent" />
        <span className="font-medium">{selected.name}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 text-zinc-500 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-xl glass p-1.5 z-50 animate-slide-down shadow-depth-lg">
          {MODELS.map((model) => {
            const isSelected = model.id === value
            return (
              <button
                key={model.id}
                onClick={() => {
                  onChange(model.id)
                  setOpen(false)
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 relative ${
                  isSelected
                    ? 'bg-accent/[0.08] text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-accent" />
                )}

                <model.icon size={16} className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-zinc-600'}`} />
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{model.name}</div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">{model.description}</div>
                </div>
                {isSelected && (
                  <Check size={14} className="text-accent mt-0.5 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
