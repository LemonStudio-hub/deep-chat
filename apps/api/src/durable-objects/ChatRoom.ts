import type { ChatMessage, DeepSeekModel, WSClientMessage, WSServerMessage } from '@deep-chat/shared'
import type { Env } from '../types'

interface MessageMeta {
  title: string
  model: DeepSeekModel
  createdAt: number
}

interface ConnectionMeta {
  lastPong: number
}

const HEARTBEAT_INTERVAL_MS = 30_000
const CONNECTION_TIMEOUT_MS = 60_000

export class ChatRoom {
  private state: DurableObjectState
  private env: Env
  private abortController: AbortController | null = null

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  // ── WebSocket upgrade ──────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]

    this.state.acceptWebSocket(server)

    // Track this connection
    const meta: ConnectionMeta = { lastPong: Date.now() }
    this.state.storage.put(`conn:${this.getWsTag(server)}`, meta)

    // Schedule heartbeat alarm if not already set
    await this.ensureAlarm()

    return new Response(null, { status: 101, webSocket: client })
  }

  // ── Hibernation handlers ───────────────────────────────────────────────────

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Update last-activity on any message (implicit keepalive)
    this.touchConnection(ws)

    const text = typeof message === 'string' ? message : new TextDecoder().decode(message)

    let data: WSClientMessage
    try {
      data = JSON.parse(text)
    } catch {
      this.send(ws, { type: 'error', message: 'Invalid JSON' })
      return
    }

    switch (data.type) {
      case 'chat':
        await this.handleChat(ws, data)
        break
      case 'stop':
        this.handleStop()
        break
      case 'history':
        await this.handleHistory(ws)
        break
      case 'pong':
        // Client responded to our ping — already handled by touchConnection above
        break
      default:
        this.send(ws, { type: 'error', message: `Unknown message type: ${(data as any).type}` })
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    this.cleanupConnection(ws)
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    this.abortController?.abort()
    this.abortController = null
    this.cleanupConnection(ws)
  }

  // ── Heartbeat via alarm ────────────────────────────────────────────────────

  async alarm(): Promise<void> {
    const now = Date.now()
    const allSockets = this.state.getWebSockets()

    // Send ping to all connections and prune stale ones
    for (const ws of allSockets) {
      const tag = this.getWsTag(ws)
      const connMeta = await this.state.storage.get<ConnectionMeta>(`conn:${tag}`)

      if (!connMeta) {
        // No metadata — stale, close
        this.safeClose(ws, 1001, 'No connection metadata')
        continue
      }

      if (now - connMeta.lastPong > CONNECTION_TIMEOUT_MS) {
        // Connection is stale — close it
        this.safeClose(ws, 1008, 'Heartbeat timeout')
        this.cleanupConnection(ws)
        continue
      }

      // Send ping
      this.send(ws, { type: 'ping', ts: now })
    }

    // Clean up alarm metadata for dead connections
    const connKeys = await this.state.storage.list({ prefix: 'conn:' })
    for (const key of connKeys.keys()) {
      const wsTag = key.replace('conn:', '')
      const stillAlive = allSockets.some((ws) => this.getWsTag(ws) === wsTag)
      if (!stillAlive) {
        await this.state.storage.delete(key)
      }
    }

    // Re-schedule alarm if there are still connections
    if (allSockets.length > 0) {
      await this.state.storage.setAlarm(Date.now() + HEARTBEAT_INTERVAL_MS)
    }
  }

  // ── Message handlers ───────────────────────────────────────────────────────

  private async handleChat(ws: WebSocket, data: WSClientMessage): Promise<void> {
    const content = data.content?.trim()
    if (!content) {
      this.send(ws, { type: 'error', message: 'Empty message' })
      return
    }

    const model: DeepSeekModel = data.model || this.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat'

    // Initialize meta on first message
    const meta = await this.state.storage.get<MessageMeta>('meta')
    if (!meta) {
      await this.state.storage.put('meta', {
        title: content.slice(0, 50) + (content.length > 50 ? '…' : ''),
        model,
        createdAt: Date.now(),
      } satisfies MessageMeta)
    }

    // Append user message to storage
    const cursor = (await this.state.storage.get<number>('cursor')) || 0
    await this.state.storage.transaction(async (txn) => {
      await txn.put(`msg:${String(cursor).padStart(4, '0')}`, { role: 'user', content, ts: Date.now() })
      await txn.put('cursor', cursor + 1)
    })

    // Build message history for DeepSeek
    const history = await this.getHistory()
    const messages: ChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }))

    // Stream response from DeepSeek
    await this.streamToWebSocket(ws, messages, model)
  }

  private async handleHistory(ws: WebSocket): Promise<void> {
    const history = await this.getHistory()
    const messages: ChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }))
    this.send(ws, { type: 'history', messages })
  }

  private handleStop(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  // ── DeepSeek streaming ─────────────────────────────────────────────────────

  private async streamToWebSocket(ws: WebSocket, messages: ChatMessage[], model: DeepSeekModel): Promise<void> {
    const abortController = new AbortController()
    this.abortController = abortController

    let response: Response
    try {
      response = await fetch(`${this.env.DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: abortController.signal,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        this.send(ws, { type: 'stream_end' })
        return
      }
      this.send(ws, { type: 'error', message: `Network error: ${err}` })
      return
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      this.send(ws, { type: 'error', message: `DeepSeek API error (${response.status}): ${errorText}` })
      return
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assistantContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const payload = trimmed.slice(6)
          if (payload === '[DONE]') {
            await this.persistAssistantMessage(assistantContent)
            this.send(ws, { type: 'stream_end' })
            this.abortController = null
            return
          }

          try {
            const chunk = JSON.parse(payload)
            const delta: string | undefined = chunk.choices?.[0]?.delta?.content
            if (delta) {
              assistantContent += delta
              this.send(ws, { type: 'stream_chunk', content: delta })
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Stream ended without [DONE] — still persist
      if (assistantContent) {
        await this.persistAssistantMessage(assistantContent)
      }
      this.send(ws, { type: 'stream_end' })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Generation was stopped by client — persist partial content
        if (assistantContent) {
          await this.persistAssistantMessage(assistantContent)
        }
        this.send(ws, { type: 'stream_end' })
      } else {
        this.send(ws, { type: 'error', message: 'Stream interrupted' })
      }
    } finally {
      this.abortController = null
    }
  }

  // ── Storage helpers ────────────────────────────────────────────────────────

  private async getHistory(): Promise<Array<ChatMessage & { ts: number }>> {
    const entries = await this.state.storage.list({ prefix: 'msg:' })
    return [...entries.values()] as Array<ChatMessage & { ts: number }>
  }

  private async persistAssistantMessage(content: string): Promise<void> {
    const cursor = (await this.state.storage.get<number>('cursor')) || 0
    await this.state.storage.transaction(async (txn) => {
      await txn.put(`msg:${String(cursor).padStart(4, '0')}`, {
        role: 'assistant',
        content,
        ts: Date.now(),
      })
      await txn.put('cursor', cursor + 1)
    })
  }

  // ── Connection tracking ────────────────────────────────────────────────────

  private getWsTag(ws: WebSocket): string {
    // Use a hash of the WebSocket's identity for storage keys
    // Durable Objects tag each accepted WS — we derive a stable key from it
    const tags = this.state.getWebSockets()
    const idx = tags.indexOf(ws)
    return idx >= 0 ? `ws:${idx}:${Date.now()}` : `ws:unknown:${Date.now()}`
  }

  private touchConnection(ws: WebSocket): void {
    // We update lastPong by scanning conn: keys — but since getWsTag isn't
    // perfectly stable across hibernations, we use a simpler approach:
    // store a single "lastActivity" timestamp that gets updated on any message.
    // The alarm checks individual connections via getWebSockets() and closes
    // those that haven't responded to pings.
    //
    // For robust tracking, we store per-WS metadata using the WS tag.
    // On any message (including pong), we mark this WS as alive.
    const allSockets = this.state.getWebSockets()
    const idx = allSockets.indexOf(ws)
    if (idx >= 0) {
      this.state.storage.put(`conn:ws:${idx}`, { lastPong: Date.now() } satisfies ConnectionMeta)
    }
  }

  private cleanupConnection(ws: WebSocket): void {
    const allSockets = this.state.getWebSockets()
    const idx = allSockets.indexOf(ws)
    if (idx >= 0) {
      this.state.storage.delete(`conn:ws:${idx}`)
    }
  }

  private async ensureAlarm(): Promise<void> {
    const currentAlarm = await this.state.storage.getAlarm()
    if (currentAlarm === null) {
      await this.state.storage.setAlarm(Date.now() + HEARTBEAT_INTERVAL_MS)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private send(ws: WebSocket, data: WSServerMessage): void {
    try {
      ws.send(JSON.stringify(data))
    } catch {
      // Socket may be closed
    }
  }

  private safeClose(ws: WebSocket, code: number, reason: string): void {
    try {
      ws.close(code, reason)
    } catch {
      // Already closed
    }
  }
}
