# Deep Chat

A beautifully designed, full-stack AI chat interface powered by DeepSeek.

Built with React + TypeScript + Tailwind CSS on the frontend (Cloudflare Pages) and Hono on the backend (Cloudflare Workers).

## Architecture

```
deep-chat/
├── apps/
│   ├── web/          # React + Vite → Cloudflare Pages
│   └── api/          # Hono → Cloudflare Workers
├── packages/
│   └── shared/       # Shared TypeScript types
└── pnpm-workspace.yaml
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

By default, the frontend proxies `/api` requests to `localhost:8787` in development. For production, set the `VITE_API_URL` environment variable to your Worker's URL.

## Deploy

```bash
# Deploy backend
pnpm deploy:api

# Deploy frontend
pnpm deploy:web
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Hono, Cloudflare Workers |
| AI | DeepSeek API (OpenAI-compatible) |
| Markdown | react-markdown, remark-gfm, rehype-highlight |
| Deployment | Cloudflare Pages + Workers |
