import type { ChatMessage, DeepSeekModel, WSClientMessage, WSServerMessage } from '@deep-chat/shared'
import type { Env } from '../types'

interface MessageMeta {
  title: string
  model: DeepSeekModel
  createdAt: number
}

const MAX_MESSAGES = 500

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

    return new Response(null, { status: 101, webSocket: client })
  }

  // ── Hibernation handlers ───────────────────────────────────────────────────

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
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
      default:
        this.send(ws, { type: 'error', message: `Unknown message type: ${(data as any).type}` })
    }
  }

  async webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    // Nothing to clean up — getWebSockets() is the source of truth
  }

  async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
    this.abortController?.abort()
    this.abortController = null
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
    const userMsg: ChatMessage = { role: 'user', content }
    await this.state.storage.put(`msg:${String(cursor).padStart(4, '0')}`, { ...userMsg, ts: Date.now() })
    await this.state.storage.put('cursor', cursor + 1)

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
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
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
            // Persist assistant message
            const cursor = (await this.state.storage.get<number>('cursor')) || 0
            await this.state.storage.put(`msg:${String(cursor).padStart(4, '0')}`, {
              role: 'assistant',
              content: assistantContent,
              ts: Date.now(),
            })
            await this.state.storage.put('cursor', cursor + 1)

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
        const cursor = (await this.state.storage.get<number>('cursor')) || 0
        await this.state.storage.put(`msg:${String(cursor).padStart(4, '0')}`, {
          role: 'assistant',
          content: assistantContent,
          ts: Date.now(),
        })
        await this.state.storage.put('cursor', cursor + 1)
      }
      this.send(ws, { type: 'stream_end' })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Generation was stopped by client — persist partial content
        if (assistantContent) {
          const cursor = (await this.state.storage.get<number>('cursor')) || 0
          await this.state.storage.put(`msg:${String(cursor).padStart(4, '0')}`, {
            role: 'assistant',
            content: assistantContent,
            ts: Date.now(),
          })
          await this.state.storage.put('cursor', cursor + 1)
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

  // ── Alarm for cleanup ──────────────────────────────────────────────────────

  async alarm(): Promise<void> {
    const meta = await this.state.storage.get<MessageMeta>('meta')
    if (!meta) {
      await this.state.storage.deleteAll()
      return
    }

    // If older than 7 days, clean up
    if (Date.now() - meta.createdAt > 7 * 24 * 60 * 60 * 1000) {
      await this.state.storage.deleteAll()
      return
    }

    // Re-set alarm for next check
    await this.state.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private send(ws: WebSocket, data: WSServerMessage): void {
    try {
      ws.send(JSON.stringify(data))
    } catch {
      // Socket may be closed
    }
  }
}
