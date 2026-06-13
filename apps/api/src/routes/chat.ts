import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ChatRequest } from '@deep-chat/shared'
import type { Env } from '../types'
import { streamChatCompletion } from '../lib/deepseek'

const chat = new Hono<{ Bindings: Env }>()

chat.post('/', async (c) => {
  const req = (await c.req.json()) as ChatRequest
  const { messages, model, temperature, maxTokens } = req

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: { message: 'Messages array is required', type: 'invalid_request' } }, 400)
  }

  const apiKey = c.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return c.json({ error: { message: 'API key not configured', type: 'server_error' } }, 500)
  }

  // ── Stream response ──────────────────────────────────────────────────────
  const upstream = await streamChatCompletion(c.env, messages, model, temperature, maxTokens)

  return streamSSE(c, async (stream) => {
    const reader = upstream.body!.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        await stream.write(text)
      }
    } catch (err) {
      console.error('[Stream error]', err)
    } finally {
      stream.close()
    }
  })
})

export default chat
