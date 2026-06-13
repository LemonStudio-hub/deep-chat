import type { ConnectionState } from '@deep-chat/shared'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

interface Props {
  state: ConnectionState
}

const LABELS: Record<ConnectionState, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
}

export default function ConnectionStatus({ state }: Props) {
  if (state === 'connected') return null

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium animate-fade-in ${
        state === 'reconnecting'
          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
          : state === 'connecting'
            ? 'bg-accent/10 text-accent border border-accent/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      {state === 'disconnected' ? (
        <WifiOff size={12} />
      ) : (
        <Loader2 size={12} className="animate-spin" />
      )}
      <span>{LABELS[state]}</span>
    </div>
  )
}
