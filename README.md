# Deep Chat

A beautifully designed, full-stack AI chat interface powered by DeepSeek.

Built with React + TypeScript + Tailwind CSS on the frontend (Cloudflare Pages) and Hono + Durable Objects on the backend (Cloudflare Workers).

## Architecture

```
deep-chat/
├── apps/
│   ├── web/          # React + Vite → Cloudflare Pages
│   └── api/          # Hono + Durable Objects → Cloudflare Workers
├── packages/
│   └── shared/       # Shared TypeScript types
└── pnpm-workspace.yaml
```

### Backend: Durable Objects + WebSocket

Each conversation is a **Durable Object instance** with its own persistent storage. The client connects via WebSocket — messages are streamed in real-time through a single persistent connection.

```
Client  ──WebSocket──▶  Hono Worker  ──fetch──▶  ChatRoom DO  ──fetch──▶  DeepSeek API
                        (routes)                 (per-conversation)       (streaming)
```

- **Hibernation API** — the DO sleeps between messages, billing only while active
- **DO storage** — messages persisted with transactional storage (zero-padded keys)
- **Alarm-based cleanup** — conversations auto-expire after 7 days of inactivity

### WebSocket Protocol

**Client → Server:**
```json
{ "type": "chat", "content": "Hello!", "model": "deepseek-chat" }
{ "type": "stop" }
{ "type": "history" }
```

**Server → Client:**
```json
{ "type": "stream_chunk", "content": "Hello" }
{ "type": "stream_end" }
{ "type": "error", "message": "..." }
{ "type": "history", "messages": [...] }
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start both frontend and backend in dev mode
pnpm dev

# Or start them individually
pnpm dev:api   # Backend on http://localhost:8787
pnpm dev:web   # Frontend on http://localhost:5173
```

## Environment Setup

### Backend (Cloudflare Workers)

Set your DeepSeek API key as a secret:

```bash
cd apps/api
npx wrangler secret put DEEPSEEK_API_KEY
```

### Frontend

By default, the frontend proxies `/api` requests (including WebSocket) to `localhost:8787` in development. For production, set the `VITE_API_URL` environment variable to your Worker's URL.

## Deploy

```bash
# Deploy backend (Worker + Durable Objects)
pnpm deploy:api

# Deploy frontend
pnpm deploy:web
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Hono, Cloudflare Workers, Durable Objects |
| AI | DeepSeek API (OpenAI-compatible) |
| Transport | WebSocket (bidirectional, persistent) |
| Markdown | react-markdown, remark-gfm, rehype-highlight |
| Deployment | Cloudflare Pages + Workers |
