import type { ChatMessage, DeepSeekModel, WSServerMessage, WSClientMessage } from '@deep-chat/shared'

const API_BASE = import.meta.env.VITE_API_URL || ''
const WS_BASE = API_BASE.replace(/^http/, 'ws') || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`

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

export class ChatSocket {
  private ws: WebSocket | null = null
  private conversationId: string
  private callbacks: ChatCallbacks | null = null
  private reconnectAttempts = 0
  private maxReconnects = 3
  private pendingConnect: Promise<void> | null = null

  constructor(conversationId: string) {
    this.conversationId = conversationId
  }

  /** Ensure the WebSocket is connected. Returns a promise that resolves on open. */
  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve()
    if (this.pendingConnect) return this.pendingConnect

    this.pendingConnect = new Promise<void>((resolve, reject) => {
      const url = `${WS_BASE}/api/ws/${this.conversationId}`
      const ws = new WebSocket(url)

      ws.onopen = () => {
        this.reconnectAttempts = 0
        this.pendingConnect = null
        resolve()
      }

      ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      ws.onclose = () => {
        this.ws = null
        this.pendingConnect = null
      }

      ws.onerror = () => {
        this.pendingConnect = null
        reject(new Error('WebSocket connection failed'))
      }

      this.ws = ws
    })

    return this.pendingConnect
  }

  /** Send a chat message and stream the response via callbacks. */
  async sendChat(content: string, model: DeepSeekModel, callbacks: ChatCallbacks): Promise<void> {
    this.callbacks = callbacks

    try {
      await this.connect()
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error('Connection failed'))
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
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error('Connection failed'))
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

  /** Close the WebSocket connection. */
  close(): void {
    this.ws?.close()
    this.ws = null
    this.callbacks = null
    this.pendingConnect = null
  }

  /** Whether the socket is currently open. */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private handleMessage(raw: string): void {
    let data: WSServerMessage
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    const cb = this.callbacks
    if (!cb) return

    switch (data.type) {
      case 'stream_chunk':
        cb.onChunk(data.content)
        break
      case 'stream_end':
        cb.onDone()
        this.callbacks = null
        break
      case 'error':
        cb.onError(new Error(data.message))
        this.callbacks = null
        break
      case 'history':
        cb.onHistory?.(data.messages)
        break
    }
  }
}
