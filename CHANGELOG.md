# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive project documentation with architecture diagrams, API reference, and design decisions
- CONTRIBUTING.md with commit conventions, PR process, and testing guidelines
- CHANGELOG.md in Keep a Changelog format
- MIT License
- GitHub issue templates (bug report, feature request)
- GitHub pull request template

## [0.2.0] - 2026-06-13

### Added
- Multi-session support with conversation sidebar
- Conversation rename and delete functionality
- Auto-generated conversation titles from first message
- Keyboard shortcut `Ctrl/Cmd+N` for new chat
- Model selector to switch between `deepseek-chat` and `deepseek-reasoner`
- WebSocket heartbeat mechanism with alarm-based scheduling (30s ping, 60s timeout)
- Connection status indicator (connecting, reconnecting, disconnected)
- Client-side keepalive pings (25s interval)
- Stale connection detection (45s no-message timeout)
- Exponential backoff with jitter for reconnection (up to 8 retries)
- Message queue for sends during reconnection
- Automatic history sync on reconnect
- Generation counter pattern to isolate state between conversation switches

### Changed
- Migrated backend from stateless Workers to Durable Objects with per-conversation instances
- Migrated transport from REST polling to persistent WebSocket connections
- Messages now stored in Durable Object SQLite storage instead of being ephemeral
- Conversation metadata stored client-side in localStorage; messages fetched from DO on demand

### Fixed
- Use SQLite migration (`new_sqlite_classes`) for Durable Objects on Cloudflare free plan
- Content isolation between conversations via generation counter to prevent stale callback corruption

## [0.1.0] - 2026-06-13

### Added
- Initial release of Deep Chat
- React 18 frontend with Vite 6, Tailwind CSS 3.4, and dark-mode UI
- Hono 4.6 backend on Cloudflare Workers
- DeepSeek API integration (OpenAI-compatible `/chat/completions`)
- Real-time streaming responses via Server-Sent Events
- Full markdown rendering with GFM support (react-markdown, remark-gfm)
- Syntax-highlighted code blocks with copy-to-clipboard (rehype-highlight, highlight.js)
- Auto-resizing message input textarea
- Stop generation button to abort in-flight responses
- Typing indicator animation during streaming
- Welcome screen with suggestion cards
- pnpm monorepo workspace (`apps/api`, `apps/web`, `packages/shared`)
- Shared TypeScript types package (`@deep-chat/shared`)
- Vite dev server with API proxy configuration
- Cloudflare Pages deployment for frontend
- Cloudflare Workers deployment for backend

---

[Unreleased]: https://github.com/LemonStudio-hub/deep-chat/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/LemonStudio-hub/deep-chat/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/LemonStudio-hub/deep-chat/releases/tag/v0.1.0
