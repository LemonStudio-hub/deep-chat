export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-accent/60 rounded-full animate-pulse-dot [animation-delay:0s]" />
        <span className="w-2 h-2 bg-accent/60 rounded-full animate-pulse-dot [animation-delay:0.2s]" />
        <span className="w-2 h-2 bg-accent/60 rounded-full animate-pulse-dot [animation-delay:0.4s]" />
      </div>
    </div>
  )
}
