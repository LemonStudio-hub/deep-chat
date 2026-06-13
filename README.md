# Deep Chat

A beautifully designed, full-stack, real-time AI chat application powered by the DeepSeek API. Features streaming responses, persistent conversations, multi-session support, and a polished dark-mode UI — all deployed to Cloudflare's edge network.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
  - [Project Structure](#project-structure)
  - [System Architecture](#system-architecture)
  - [Data Flow](#data-flow)
  - [WebSocket Protocol](#websocket-protocol)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Development](#development)
- [Deployment](#deployment)
  - [Backend (Cloudflare Workers)](#backend-cloudflare-workers)
  - [Frontend (Cloudflare Pages)](#frontend-cloudflare-pages)
- [Available Scripts](#available-scripts)
- [Project Packages](#project-packages)
  - [packages/shared](#packagesshared)
  - [apps/api](#appsapi)
  - [apps/web](#appsweb)
- [Configuration Reference](#configuration-reference)
- [API Reference](#api-reference)
- [Key Design Decisions](#key-design-decisions)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Real-time streaming** — AI responses stream token-by-token over WebSocket with a typing indicator
- **Persistent conversations** — each conversation is backed by a Durable Object with SQLite storage
- **Multi-session support** — create, rename, switch, and delete conversations with sidebar management
- **Dual model support** — switch between `deepseek-chat` (DeepSeek-V3) and `deepseek-reasoner` (DeepSeek-R1 with chain-of-thought)
- **Rich markdown rendering** — full GFM support with syntax-highlighted code blocks and copy-to-clipboard
- **Connection resilience** — automatic reconnection with exponential backoff, heartbeat keepalive, and stale connection detection
- **Stop generation** — abort in-flight AI responses mid-stream
- **Dark-mode UI** — polished interface built with Tailwind CSS, responsive for mobile and desktop
- **Edge-deployed** — frontend on Cloudflare Pages, backend on Cloudflare Workers with Durable Objects
- **Cost-efficient** — WebSocket Hibernation API ensures the Durable Object only bills while actively processing

---

## Architecture

### Project Structure

```
deep-chat/
├── apps/
│   ├── api/                          # Backend: Hono + Durable Objects
│   │   ├── src/
│   │   │   ├── index.ts              # Hono app entry, routing, WebSocket upgrade
│   │   │   ├── types.ts              # Env interface (bindings + secrets)
│   │   │   ├── durable-objects/
│   │   │   │   └── ChatRoom.ts       # Core DO: WebSocket, storage, DeepSeek streaming
│   │   │   ├── middleware/
│   │   │   │   └── error-handler.ts  # Global error handler
│   │   │   └── routes/
│   │   │       └── models.ts         # GET /api/models endpoint
│   │   ├── wrangler.toml             # Worker + DO configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                          # Frontend: React + Vite
│       ├── src/
│       │   ├── main.tsx              # React entry point
│       │   ├── App.tsx               # Root component, state orchestration
│       │   ├── components/
│       │   │   ├── Sidebar.tsx       # Conversation list + management
│       │   │   ├── ChatArea.tsx      # Main chat view container
│       │   │   ├── ChatInput.tsx     # Message input with auto-resize
│       │   │   ├── MessageBubble.tsx # User/assistant message display
│       │   │   ├── MarkdownRenderer.tsx  # GFM markdown + syntax highlighting
│       │   │   ├── ModelSelector.tsx # DeepSeek model picker
│       │   │   ├── ConnectionStatus.tsx  # WebSocket state badge
│       │   │   ├── TypingIndicator.tsx   # Streaming dots animation
│       │   │   └── WelcomeScreen.tsx # Landing page with suggestions
│       │   ├── hooks/
│       │   │   ├── useConversations.ts   # Conversation CRUD, localStorage
│       │   │   └── useChat.ts        # WebSocket lifecycle, message state
│       │   └── lib/
│       │       ├── api.ts            # ChatSocket class, fetchModels()
│       │       └── storage.ts        # localStorage persistence
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── shared/                       # Shared TypeScript types
│       └── src/
│           └── index.ts              # WebSocket protocol, message, and model types
├── package.json                      # Root monorepo scripts
├── pnpm-workspace.yaml               # Workspace definition
├── tsconfig.base.json                # Shared TypeScript config
└── .gitignore
```

### System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Cloudflare Edge                               │
│                                                                       │
│  ┌─────────────────┐       ┌──────────────────────────────────────┐  │
│  │  Cloudflare      │       │  Cloudflare Workers                  │  │
│  │  Pages           │       │                                      │  │
│  │                  │       │  ┌─────────────┐                     │  │
│  │  React SPA       │       │  │ Hono Worker  │                     │  │
│  │  (Vite build)    │       │  │              │                     │  │
│  │                  │       │  │ GET /api/ws/ │──── WebSocket ───┐ │  │
│  └────────▲─────────┘       │  │   :convId    │    upgrade       │ │  │
│           │                 │  └──────────────┘                  │ │  │
│           │ HTTPS            │         │                         │ │  │
│           │                 │         ▼ fetch()                  │ │  │
│           │                 │  ┌──────────────────────┐          │ │  │
│           │                 │  │ ChatRoom Durable      │◀────────┘ │  │
│           │                 │  │ Object Instance       │           │  │
│           │                 │  │                       │           │  │
│           │                 │  │ ┌───────────────────┐ │           │  │
│           │                 │  │ │  SQLite Storage    │ │           │  │
│           │                 │  │ │  msg:0000, 0001..  │ │           │  │
│           │                 │  │ │  meta, cursor      │ │           │  │
│           │                 │  │ └───────────────────┘ │           │  │
│           │                 │  └──────────┬────────────┘           │  │
│           │                 │             │                        │  │
│           │                 └─────────────┼────────────────────────┘  │
│           │                               │                           │
└───────────┼───────────────────────────────┼───────────────────────────┘
            │                               │
            │                               │ HTTPS (streaming SSE)
            │                               ▼
        Browser                   ┌──────────────────┐
                                  │  DeepSeek API     │
                                  │  /chat/completions│
                                  └──────────────────┘
```

### Data Flow

```
User types message
       │
       ▼
ChatInput ──▶ useChat.sendMessage()
                     │
                     ▼
              ChatSocket.send({ type: 'chat', content, model })
                     │
                     ▼ WebSocket
              Hono Worker (routes upgrade to DO)
                     │
                     ▼ fetch()
              ChatRoom.webSocketMessage()
                     │
              ┌──────┴──────┐
              ▼             ▼
     Store user msg    POST DeepSeek API
     in SQLite         (stream: true)
              │             │
              │             ▼
              │     Parse SSE data: lines
              │             │
              │             ▼
              │     Send stream_chunk ──▶ Client accumulates
              │             │             into assistant message
              │             ▼
              │     [DONE] received
              │             │
              │             ▼
              │     Store assistant msg
              │     Send stream_end
              │             │
              └─────────────┘
```

### WebSocket Protocol

#### Client → Server

| Type | Fields | Description |
|------|--------|-------------|
| `chat` | `content: string`, `model: string` | Send a user message and trigger AI response |
| `stop` | — | Abort the current streaming response |
| `history` | — | Request all stored messages for this conversation |
| `pong` | — | Respond to server heartbeat ping |

```json
{ "type": "chat", "content": "Hello!", "model": "deepseek-chat" }
{ "type": "stop" }
{ "type": "history" }
{ "type": "pong" }
```

#### Server → Client

| Type | Fields | Description |
|------|--------|-------------|
| `stream_chunk` | `content: string` | A single token delta from the AI |
| `stream_end` | — | AI response complete; full message stored |
| `error` | `message: string` | An error occurred |
| `history` | `messages: ChatMessage[]` | Full conversation history |
| `ping` | — | Server heartbeat; client must respond with `pong` |

```json
{ "type": "stream_chunk", "content": "Hello" }
{ "type": "stream_end" }
{ "type": "error", "message": "DeepSeek API error: 429" }
{ "type": "history", "messages": [{ "role": "user", "content": "Hi" }, ...] }
{ "type": "ping" }
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend Framework | React | 18 |
| Build Tool | Vite | 6 |
| CSS | Tailwind CSS | 3.4 |
| Backend Framework | Hono | 4.6 |
| Runtime | Cloudflare Workers | — |
| State & Storage | Durable Objects (SQLite) | — |
| AI Provider | DeepSeek API | OpenAI-compatible |
| Transport | WebSocket (Hibernation API) | — |
| Markdown | react-markdown + remark-gfm + rehype-highlight | 9 / 4 / 7 |
| Syntax Highlighting | highlight.js | 11 |
| Icons | lucide-react | 0.460 |
| Language | TypeScript | 5.5 |
| Package Manager | pnpm (monorepo) | — |
| Deployment | Cloudflare Pages + Workers | — |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** (install via `npm install -g pnpm`)
- **Cloudflare account** (free tier works) with Wrangler CLI authenticated
- **DeepSeek API key** (get one at [platform.deepseek.com](https://platform.deepseek.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/LemonStudio-hub/deep-chat.git
cd deep-chat

# Install all dependencies (monorepo)
pnpm install
```

### Environment Setup

#### Backend — DeepSeek API Key

The API key is stored as a Cloudflare Worker secret (never committed to source):

```bash
cd apps/api
npx wrangler secret put DEEPSEEK_API_KEY
# Paste your DeepSeek API key when prompted
```

#### Backend — Optional Variables

These are set in `apps/api/wrangler.toml` under `[vars]` and can be overridden per-environment:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek API base URL |
| `DEEPSEEK_DEFAULT_MODEL` | `deepseek-chat` | Default model when client doesn't specify |

#### Frontend — Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | Same-origin `/api` | Backend API URL. Already set to `https://api.memepedia.online` in `.env.production`. |

### Development

```bash
# Start both frontend and backend concurrently
pnpm dev

# Or start them individually
pnpm dev:api   # Backend → http://localhost:8787
pnpm dev:web   # Frontend → http://localhost:5173
```

The Vite dev server automatically proxies `/api` requests (including WebSocket upgrades) to `localhost:8787`, so no extra configuration is needed during development.

Open [http://localhost:5173](http://localhost:5173) in your browser to use the app.

---

## Deployment

### Backend (Cloudflare Workers)

```bash
# Deploy the Worker + Durable Objects
pnpm deploy:api

# Or from the api directory
cd apps/api
npx wrangler deploy
```

This deploys:
- The Hono Worker (`deep-chat-api`)
- The `ChatRoom` Durable Object class with SQLite storage

Make sure the `DEEPSEEK_API_KEY` secret is set for the target environment:

```bash
cd apps/api
npx wrangler secret put DEEPSEEK_API_KEY
```

### Frontend (Cloudflare Pages)

```bash
# Build and deploy the frontend
pnpm deploy:web

# Or manually
cd apps/web
pnpm build
npx wrangler pages deploy ./dist
```

The production `VITE_API_URL` is already set in `apps/web/.env.production`:

```
VITE_API_URL=https://api.memepedia.online
```

The frontend is accessible at **https://chat.memepedia.online** and the API at **https://api.memepedia.online**.

---

## Available Scripts

### Root (monorepo)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start both API and web in parallel |
| `pnpm dev:api` | Start only the backend |
| `pnpm dev:web` | Start only the frontend |
| `pnpm build` | Build shared → API → web (in order) |
| `pnpm deploy:api` | Deploy backend to Cloudflare Workers |
| `pnpm deploy:web` | Deploy frontend to Cloudflare Pages |
| `pnpm lint` | Lint all packages |
| `pnpm clean` | Remove all `dist/`, `node_modules/`, `.wrangler/` |

### apps/api

| Script | Description |
|--------|-------------|
| `pnpm dev` | `wrangler dev` — local Workers runtime with DO emulation |
| `pnpm build` | `wrangler deploy --dry-run --outdir=dist` |
| `pnpm deploy` | `wrangler deploy` to Cloudflare |

### apps/web

| Script | Description |
|--------|-------------|
| `pnpm dev` | Vite dev server with API proxy |
| `pnpm build` | TypeScript check + Vite production build |
| `pnpm preview` | Preview production build locally |
| `pnpm deploy` | `wrangler pages deploy ./dist` |

---

## Project Packages

### packages/shared

Shared TypeScript types used by both frontend and backend. Exports raw `.ts` source (no build step required by consumers).

**Exported types:**

```typescript
// Message types
type MessageRole = 'system' | 'user' | 'assistant'
interface ChatMessage { role: MessageRole; content: string }

// Model types
type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner'

// API types
interface ChatRequest { messages: ChatMessage[]; model?: DeepSeekModel; stream?: boolean }
interface ChatResponse { id: string; choices: StreamChoice[]; usage: TokenUsage }
interface TokenUsage { prompt_tokens: number; completion_tokens: number; total_tokens: number }

// Conversation
interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  model: DeepSeekModel
  createdAt: number
  updatedAt: number
}

// WebSocket protocol
interface WSClientMessage { type: 'chat' | 'stop' | 'history' | 'pong'; content?: string; model?: string }
type WSServerMessage =
  | { type: 'stream_chunk'; content: string }
  | { type: 'stream_end' }
  | { type: 'error'; message: string }
  | { type: 'history'; messages: ChatMessage[] }
  | { type: 'ping' }

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
```

### apps/api

The backend is a [Hono](https://hono.dev/) application running on Cloudflare Workers, with each conversation backed by a Durable Object.

**Key files:**

- **`src/index.ts`** — Hono app with CORS, error handling, REST routes, and WebSocket upgrade handler
- **`src/durable-objects/ChatRoom.ts`** — The core Durable Object (352 lines) that handles:
  - WebSocket connection lifecycle (upgrade, hibernation, heartbeat)
  - Message storage with transactional SQLite writes
  - DeepSeek API streaming with SSE parsing
  - Connection health monitoring via Cloudflare Alarms
- **`src/routes/models.ts`** — Returns the list of available DeepSeek models
- **`src/middleware/error-handler.ts`** — Global error handler returning JSON responses

**Durable Object storage schema:**

| Key | Value | Description |
|-----|-------|-------------|
| `meta` | `{ title, model, createdAt }` | Conversation metadata |
| `cursor` | `number` | Next message index (auto-incrementing) |
| `msg:0000` | `ChatMessage` | First message |
| `msg:0001` | `ChatMessage` | Second message |
| `...` | `...` | ... |
| `conn:ws:0` | `{ connectedAt, lastActivity }` | Active connection metadata |
| `conn:ws:1` | `{ connectedAt, lastActivity }` | Another connection |

### apps/web

The frontend is a React single-page application built with Vite and styled with Tailwind CSS.

**Component hierarchy:**

```
App
├── Sidebar
│   ├── New Chat button
│   └── Conversation list (rename, delete)
└── ChatArea
    ├── Header bar
    │   ├── ModelSelector
    │   └── ConnectionStatus
    ├── Message list
    │   ├── WelcomeScreen (when empty)
    │   ├── MessageBubble (user)
    │   │   └── plain text
    │   └── MessageBubble (assistant)
    │       └── MarkdownRenderer
    │           └── code blocks with copy button
    ├── TypingIndicator (during streaming)
    └── ChatInput (auto-resize textarea)
```

**Hooks:**

- **`useConversations`** — Manages conversation metadata in localStorage. Provides CRUD operations: create, switch, delete, rename, auto-title (from first message), and model updates.
- **`useChat`** — Manages the WebSocket lifecycle for the active conversation. Uses a **generation counter** to safely discard stale callbacks when switching between conversations. Handles message sending, streaming accumulation, history loading, and reconnection.

**WebSocket client (`ChatSocket`):**

- Automatic connection with exponential backoff + jitter (up to 8 retries)
- Stale connection detection (45-second no-message timeout)
- Client-side keepalive pings every 25 seconds
- Message queue for sends during reconnection
- Full protocol handling: `ping`→`pong`, `stream_chunk` accumulation, `stream_end`, `error`, `history`

---

## Configuration Reference

### wrangler.toml (apps/api)

```toml
name = "deep-chat-api"
main = "src/index.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

[vars]
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_DEFAULT_MODEL = "deepseek-chat"

[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["ChatRoom"]
```

### Tailwind (apps/web)

Custom theme colors:

| Token | Hex | Usage |
|-------|-----|-------|
| `surface-0` | `#0f1117` | Page background |
| `surface-1` | `#1a1d27` | Cards, sidebars |
| `surface-2` | `#252833` | Hover states, inputs |
| `surface-3` | `#2e3241` | Borders, subtle accents |
| `accent` | `#22d3ee` | Primary accent (cyan) |

Custom animations: `fade-in`, `slide-up`, `pulse-dot`.

---

## API Reference

### REST Endpoints

#### `GET /`

Health check.

**Response:**
```json
{ "status": "ok", "service": "deep-chat-api" }
```

#### `GET /api/models`

Returns available DeepSeek models.

**Response:**
```json
{
  "models": [
    {
      "id": "deepseek-chat",
      "name": "DeepSeek-V3",
      "description": "DeepSeek-V3 — fast, general-purpose chat model"
    },
    {
      "id": "deepseek-reasoner",
      "name": "DeepSeek-R1",
      "description": "DeepSeek-R1 — reasoning model with chain-of-thought"
    }
  ]
}
```

#### `GET /api/ws/:conversationId`

WebSocket upgrade endpoint. The `:conversationId` is a UUID that maps to a Durable Object instance named `conversation:<id>`.

### Environment Variables

| Variable | Scope | Required | Default | Description |
|----------|-------|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | Worker secret | ✅ | — | DeepSeek API authentication key |
| `DEEPSEEK_BASE_URL` | Worker vars | ❌ | `https://api.deepseek.com` | DeepSeek API base URL |
| `DEEPSEEK_DEFAULT_MODEL` | Worker vars | ❌ | `deepseek-chat` | Default model when unspecified |
| `VITE_API_URL` | Frontend build | ❌ | `https://api.memepedia.online` | Backend API URL (set in `.env.production`) |

---

## Key Design Decisions

### Durable Objects with SQLite Storage

Each conversation is an isolated Durable Object instance. Messages are stored with zero-padded keys (`msg:0000`, `msg:0001`, ...) under an auto-incrementing `cursor` counter. All writes are transactional for atomicity. The `v1` migration uses `new_sqlite_classes` which is required for the Cloudflare free plan.

### WebSocket Hibernation API

The Durable Object uses `state.acceptWebSocket(server)` instead of keeping the DO alive for the full connection lifetime. This means the DO only consumes resources (and is billed) while actively processing messages — it sleeps between them.

### Generation Counter Pattern

The frontend uses a monotonically increasing counter to invalidate stale async callbacks when the user switches conversations. When a conversation switch occurs:
1. The generation counter increments
2. The old WebSocket closes
3. All UI state resets
4. A new WebSocket opens for the new conversation
5. Any in-flight callbacks from the old conversation check the generation counter and discard themselves if stale

This prevents race conditions where streaming chunks from an old conversation corrupt the UI of a new one.

### Client-Side Metadata Only

The frontend stores only lightweight conversation metadata (id, title, model, timestamps) in `localStorage`. All actual messages live in the Durable Object and are fetched via WebSocket `history` requests. This keeps `localStorage` small, avoids sync issues, and ensures message consistency across devices.

### Alarm-Based Heartbeat

Rather than keeping the DO awake, the Cloudflare Alarms API is used to periodically check connection health:
- An alarm fires every 30 seconds while connections exist
- Each alarm tick pings all connected WebSockets
- Connections with no activity for 60 seconds are closed
- The alarm self-cancels when no connections remain

### SSE Parsing in the Durable Object

The DO directly reads the streaming response body from the DeepSeek API using `ReadableStream`, parses Server-Sent Event `data:` lines, and forwards each token delta over WebSocket. This avoids any intermediate buffering layer and minimizes time-to-first-token.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the linter: `pnpm lint`
5. Test locally: `pnpm dev`
6. Commit your changes: `git commit -m "feat: add my feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request

### Code Style

- TypeScript strict mode is enabled
- Follow existing naming conventions (camelCase for variables/functions, PascalCase for components)
- Keep components focused and small
- Use the shared types from `@deep-chat/shared` for all protocol definitions

---

## License

MIT
