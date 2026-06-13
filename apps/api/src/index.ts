import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { errorHandler } from './middleware/error-handler'
import chat from './routes/chat'
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

// ── Routes ────────────────────────────────────────────────────────────────
app.route('/api/chat', chat)
app.route('/api/models', models)

// ── Health check ──────────────────────────────────────────────────────────
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'deep-chat-api' })
})

export default app
