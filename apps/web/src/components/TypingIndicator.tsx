export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[7px] h-[7px] bg-accent/50 rounded-full animate-pulse-dot [animation-delay:${i * 0.15}s]"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
