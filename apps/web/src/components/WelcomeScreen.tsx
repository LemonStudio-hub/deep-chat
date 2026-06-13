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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-6">
          <Sparkles size={32} className="text-accent" />
        </div>

        <h1 className="text-3xl font-semibold text-white mb-2">Deep Chat</h1>
        <p className="text-gray-400 mb-10">Powered by DeepSeek AI. Ask me anything.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SUGGESTIONS.map(({ icon: Icon, text, label }) => (
            <button
              key={label}
              onClick={() => onSuggestion(text)}
              className="glass glass-hover rounded-xl p-4 text-left transition-all hover:border-accent/20 group"
            >
              <Icon size={18} className="text-accent mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-gray-300 leading-snug">{text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
