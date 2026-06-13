import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { errorHandler } from './middleware/error-handler'
import models from './routes/models'

const app = new Hono<{ Bindings: Env }>()

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
)

app.onError(errorHandler)

// ── HTTP routes ───────────────────────────────────────────────────────────
app.route('/api/models', models)

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'deep-chat-api' })
})

// ── WebSocket route → Durable Object ──────────────────────────────────────
app.get('/api/ws/:conversationId', (c) => {
  const conversationId = c.req.param('conversationId')

  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426)
  }

  const id = c.env.CHAT_ROOM.idFromName(`conversation:${conversationId}`)
  const stub = c.env.CHAT_ROOM.get(id)

  return stub.fetch(c.req.raw)
})

export { ChatRoom } from './durable-objects/ChatRoom'
export default app
