import type { DeepSeekModel } from '@deep-chat/shared'
import { ChevronDown, Sparkles, Brain } from 'lucide-react'
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass glass-hover text-sm text-gray-300 transition-colors"
      >
        <selected.icon size={14} className="text-accent" />
        <span>{selected.name}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl glass p-1 z-50 animate-fade-in">
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onChange(model.id)
                setOpen(false)
              }}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                model.id === value ? 'bg-accent/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <model.icon size={16} className="mt-0.5 text-accent flex-shrink-0" />
              <div>
                <div className="text-sm font-medium">{model.name}</div>
                <div className="text-xs opacity-60">{model.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
