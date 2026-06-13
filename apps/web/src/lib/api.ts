import type { ChatMessage, DeepSeekModel, StreamChunk } from '@deep-chat/shared'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ─── Fetch available models ──────────────────────────────────────────────────

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

// ─── Stream chat completion ──────────────────────────────────────────────────

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (err: Error) => void
}

export async function streamChat(
  messages: ChatMessage[],
  model: DeepSeekModel,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, stream: true }),
    signal,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const msg = errorData?.error?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

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

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          callbacks.onDone()
          return
        }

        try {
          const chunk: StreamChunk = JSON.parse(data)
          const content = chunk.choices?.[0]?.delta?.content
          if (content) {
            callbacks.onChunk(content)
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    callbacks.onDone()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      callbacks.onDone()
    } else {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
