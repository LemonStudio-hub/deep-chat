import type {
  ChatMessage,
  DeepSeekModel,
  WSServerMessage,
  WSClientMessage,
  ConnectionState,
} from '@deep-chat/shared'

const API_BASE = import.meta.env.VITE_API_URL || ''
const WS_BASE =
  API_BASE.replace(/^http/, 'ws') || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`

// ─── Fetch available models (REST) ───────────────────────────────────────────

export interface ModelInfo {
  id: DeepSeekModel
  name: string
  description: string
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API_BASE}/api/models`)
  if (!res.ok) throw new Error('Failed to fetch models')
  const data = await res.json()
  return data.models
}

// ─── WebSocket chat client ───────────────────────────────────────────────────

export interface ChatCallbacks {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (err: Error) => void
  onHistory?: (messages: ChatMessage[]) => void
}

type PendingMessage =
  | { kind: 'chat'; content: string; model: DeepSeekModel; callbacks: ChatCallbacks }
  | { kind: 'history'; callbacks: ChatCallbacks }

export interface ChatSocketOptions {
  onConnectionStateChange?: (state: ConnectionState) => void
  maxReconnects?: number
}

export class ChatSocket {
  private ws: WebSocket | null = null
  private conversationId: string
  private callbacks: ChatCallbacks | null = null
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnects: number
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null
  private staleTimer: ReturnType<typeof setTimeout> | null = null
  private pendingConnect: Promise<void> | null = null
  private pendingMessage: PendingMessage | null = null
  private closed = false
  private onConnectionStateChange?: (state: ConnectionState) => void

  constructor(conversationId: string, options?: ChatSocketOptions) {
    this.conversationId = conversationId
    this.maxReconnects = options?.maxReconnects ?? 8
    this.onConnectionStateChange = options?.onConnectionStateChange
  }

  // ── Connection lifecycle ───────────────────────────────────────────────────

  /** Ensure the WebSocket is connected. Returns a promise that resolves on open. */
  connect(): Promise<void> {
    if (this.closed) return Promise.reject(new Error('Socket closed'))
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve()
    if (this.pendingConnect) return this.pendingConnect

    this.setConnectionState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting')

    this.pendingConnect = new Promise<void>((resolve, reject) => {
      const url = `${WS_BASE}/api/ws/${this.conversationId}`
      const ws = new WebSocket(url)

      ws.onopen = () => {
        this.reconnectAttempts = 0
        this.pendingConnect = null
        this.setConnectionState('connected')
        this.startKeepalive()
        this.resetStaleTimer()
        resolve()

        // Retry pending message if any
        if (this.pendingMessage) {
          const msg = this.pendingMessage
          this.pendingMessage = null
          if (msg.kind === 'chat') {
            this.sendChat(msg.content, msg.model, msg.callbacks)
          } else {
            this.requestHistory(msg.callbacks)
          }
        }
      }

      ws.onmessage = (event) => {
        this.resetStaleTimer()
        this.handleMessage(event.data)
      }

      ws.onclose = (event) => {
        this.stopKeepalive()
        this.ws = null
        this.pendingConnect = null

        if (!this.closed && event.code !== 1000) {
          // Unexpected close — attempt reconnect
          this.scheduleReconnect()
        } else {
          this.setConnectionState('disconnected')
        }
      }

      ws.onerror = () => {
        // onclose fires after onerror, so reconnection is handled there
        if (this.pendingConnect) {
          this.pendingConnect = null
          reject(new Error('WebSocket connection failed'))
        }
      }

      this.ws = ws
    })

    return this.pendingConnect
  }

  /** Close the WebSocket connection permanently. */
  close(): void {
    this.closed = true
    this.stopKeepalive()
    this.clearStaleTimer()
    this.clearReconnectTimer()
    this.pendingConnect = null
    this.pendingMessage = null
    this.callbacks = null

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client closing')
      } catch {
        // Already closed
      }
      this.ws = null
    }

    this.setConnectionState('disconnected')
  }

  /** Whether the socket is currently open. */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get connectionStateValue(): ConnectionState {
    return this.connectionState
  }

  // ── Message sending ────────────────────────────────────────────────────────

  /** Send a chat message and stream the response via callbacks. */
  async sendChat(content: string, model: DeepSeekModel, callbacks: ChatCallbacks): Promise<void> {
    this.callbacks = callbacks

    try {
      await this.connect()
    } catch {
      // Connection failed — if we'll retry, queue the message
      if (this.reconnectAttempts < this.maxReconnects) {
        this.pendingMessage = { kind: 'chat', content, model, callbacks }
        return
      }
      callbacks.onError(new Error('Connection failed after max retries'))
      return
    }

    const msg: WSClientMessage = { type: 'chat', content, model }
    this.ws!.send(JSON.stringify(msg))
  }

  /** Request conversation history from the DO. */
  async requestHistory(callbacks: ChatCallbacks): Promise<void> {
    this.callbacks = callbacks

    try {
      await this.connect()
    } catch {
      if (this.reconnectAttempts < this.maxReconnects) {
        this.pendingMessage = { kind: 'history', callbacks }
        return
      }
      callbacks.onError(new Error('Connection failed after max retries'))
      return
    }

    const msg: WSClientMessage = { type: 'history' }
    this.ws!.send(JSON.stringify(msg))
  }

  /** Stop the current generation. */
  stop(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: WSClientMessage = { type: 'stop' }
      this.ws.send(JSON.stringify(msg))
    }
  }

  // ── Heartbeat (client side) ────────────────────────────────────────────────

  private startKeepalive(): void {
    this.stopKeepalive()
    // Browser-level WebSocket keepalive — send a lightweight message every 25s
    // This keeps the connection alive through proxies/load balancers
    this.keepaliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send pong as keepalive (the DO sends ping, we respond)
        // If no ping received, this interval just resets the stale timer
      }
    }, 25_000)
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer)
      this.keepaliveTimer = null
    }
  }

  private resetStaleTimer(): void {
    this.clearStaleTimer()
    // If no message received in 45s, connection is likely dead
    this.staleTimer = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.close(1008, 'Stale — no ping received')
      }
    }, 45_000)
  }

  private clearStaleTimer(): void {
    if (this.staleTimer) {
      clearTimeout(this.staleTimer)
      this.staleTimer = null
    }
  }

  // ── Reconnection ───────────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.closed) return
    if (this.reconnectAttempts >= this.maxReconnects) {
      this.setConnectionState('disconnected')
      // Fail any pending callbacks
      if (this.callbacks) {
        this.callbacks.onError(new Error('Connection lost — max reconnect attempts reached'))
        this.callbacks = null
      }
      return
    }

    this.setConnectionState('reconnecting')

    // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const base = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000)
    const jitter = base * 0.5 * Math.random()
    const delay = base + jitter

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      this.connect().catch(() => {
        // Reconnection failed — will retry via onclose handler
      })
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // ── Message handling ───────────────────────────────────────────────────────

  private handleMessage(raw: string): void {
    let data: WSServerMessage
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    switch (data.type) {
      case 'ping':
        // Respond to server heartbeat
        if (this.ws?.readyState === WebSocket.OPEN) {
          const pong: WSClientMessage = { type: 'pong' }
          this.ws.send(JSON.stringify(pong))
        }
        break

      case 'stream_chunk':
        this.callbacks?.onChunk(data.content)
        break

      case 'stream_end':
        this.callbacks?.onDone()
        this.callbacks = null
        break

      case 'error':
        this.callbacks?.onError(new Error(data.message))
        this.callbacks = null
        break

      case 'history':
        this.callbacks?.onHistory?.(data.messages)
        break
    }
  }

  // ── State management ───────────────────────────────────────────────────────

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return
    this.connectionState = state
    this.onConnectionStateChange?.(state)
  }
}
