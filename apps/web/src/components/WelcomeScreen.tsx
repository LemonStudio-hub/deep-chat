import { Sparkles, Code, BookOpen, Lightbulb } from 'lucide-react'

interface Props {
  onSuggestion: (text: string) => void
}

const SUGGESTIONS = [
  { icon: Code, text: 'Write a Python script to sort a CSV file', label: 'Code' },
  { icon: BookOpen, text: 'Explain quantum computing in simple terms', label: 'Explain' },
  { icon: Lightbulb, text: 'Give me 5 startup ideas for 2025', label: 'Ideas' },
]

export default function WelcomeScreen({ onSuggestion }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center animate-fade-in">
        {/* Logo with glow */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 w-20 h-20 -m-2 bg-accent/[0.06] rounded-3xl blur-xl" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/15 to-violet/10 ring-1 ring-white/[0.06] flex items-center justify-center">
            <Sparkles size={28} className="text-accent" />
          </div>
        </div>

        <h1 className="text-3xl font-semibold text-gradient mb-3 tracking-tight">Deep Chat</h1>
        <p className="text-zinc-500 mb-12 text-[15px] leading-relaxed">Powered by DeepSeek AI. Ask me anything.</p>

        {/* Suggestion cards with staggered entrance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SUGGESTIONS.map(({ icon: Icon, text, label }, index) => (
            <button
              key={label}
              onClick={() => onSuggestion(text)}
              className="glass rounded-xl p-4 text-left transition-all duration-300 hover:border-accent/[0.15] hover:shadow-glow-sm hover:-translate-y-0.5 group animate-bounce-in"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
            >
              <div className="w-8 h-8 rounded-lg bg-accent/[0.08] flex items-center justify-center mb-3 group-hover:bg-accent/[0.12] transition-colors">
                <Icon size={16} className="text-accent group-hover:scale-110 transition-transform duration-200" />
              </div>
              <p className="text-[13px] text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
