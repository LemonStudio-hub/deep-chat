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
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-medium animate-slide-up backdrop-blur-sm ring-1 ${
        state === 'reconnecting'
          ? 'bg-yellow-500/[0.08] text-yellow-400 ring-yellow-500/15'
          : state === 'connecting'
            ? 'bg-accent/[0.08] text-accent ring-accent/15'
            : 'bg-red-500/[0.08] text-red-400 ring-red-500/15'
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
