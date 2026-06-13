# Contributing to Deep Chat

Thank you for your interest in contributing to Deep Chat! This document covers everything you need to know to get started.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Branch Strategy](#branch-strategy)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Code Style](#code-style)
- [Reporting Issues](#reporting-issues)

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** — install globally via `npm install -g pnpm`
- **Cloudflare account** (free tier works) with Wrangler CLI authenticated
- **DeepSeek API key** — get one at [platform.deepseek.com](https://platform.deepseek.com)

### Setup

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/deep-chat.git
cd deep-chat

# Add the upstream remote
git remote add upstream https://github.com/LemonStudio-hub/deep-chat.git

# Install dependencies
pnpm install

# Set up the backend secret
cd apps/api
npx wrangler secret put DEEPSEEK_API_KEY
cd ../..

# Start development servers
pnpm dev
```

This starts the backend on `http://localhost:8787` and the frontend on `http://localhost:5173`.

---

## Development Workflow

1. **Sync with upstream** before starting work:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

3. **Make your changes**, following the [commit conventions](#commit-conventions) and [code style](#code-style) guidelines.

4. **Test locally**:
   ```bash
   pnpm dev          # Start dev servers
   pnpm lint         # Run linter across all packages
   pnpm build        # Verify production build succeeds
   ```

5. **Push and open a PR**:
   ```bash
   git push origin feat/my-feature
   ```

---

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | A new feature | `feat(web): add dark mode toggle` |
| `fix` | A bug fix | `fix(api): handle empty message content` |
| `docs` | Documentation only | `docs: add deployment guide` |
| `style` | Code style (formatting, semicolons, etc.) | `style(web): fix indentation in ChatArea` |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor(api): extract streaming logic` |
| `perf` | Performance improvement | `perf(web): memoize markdown renderer` |
| `test` | Adding or updating tests | `test(api): add ChatRoom unit tests` |
| `build` | Build system or external dependencies | `build: upgrade Vite to v6` |
| `ci` | CI/CD configuration | `ci: add GitHub Actions workflow` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `revert` | Reverting a previous commit | `revert: undo WebSocket change` |

### Scopes

Use the package or area affected:

| Scope | Description |
|-------|-------------|
| `api` | Backend (Hono + Durable Objects) |
| `web` | Frontend (React + Vite) |
| `shared` | Shared types package |
| `docs` | Documentation |
| `repo` | Repository configuration (CI, templates, etc.) |

Scopes are optional but encouraged when the change is clearly scoped to one area.

### Rules

- **Subject line**: imperative mood, lowercase, no period at the end, max 72 characters
- **Body**: wrap at 72 characters, explain *what* and *why* (not *how*)
- **Footer**: reference issues with `Closes #123` or `Fixes #123`

### Examples

```
feat(web): add conversation export to markdown

Allow users to download the current conversation as a .md file
with proper formatting and metadata.

Closes #42
```

```
fix(api): prevent duplicate messages on reconnect

The generation counter was not being incremented when the WebSocket
reconnected, causing the client to process stale stream_chunk messages
from the previous connection.

Fixes #87
```

```
docs: comprehensive project documentation

Expand README with architecture diagrams, API reference,
configuration guide, and key design decisions.
```

---

## Branch Strategy

- **`main`** — stable, production-ready code. All PRs target this branch.
- **`feat/*`** — feature branches. Branched from `main`.
- **`fix/*`** — bug fix branches. Branched from `main`.
- **`docs/*`** — documentation branches. Branched from `main`.

### Branch Naming

```
feat/short-description
fix/issue-number-short-description
docs/what-is-documented
```

Examples:
```
feat/conversation-export
fix/42-duplicate-messages
docs/api-reference
```

---

## Pull Request Process

### Before Opening a PR

- [ ] Code compiles without errors (`pnpm build`)
- [ ] Linter passes (`pnpm lint`)
- [ ] Manual testing completed (`pnpm dev`)
- [ ] Commit messages follow [conventions](#commit-conventions)
- [ ] Branch is up to date with `main`

### Opening the PR

1. Push your branch to your fork:
   ```bash
   git push origin feat/my-feature
   ```

2. Open a PR against `main` on the upstream repository.

3. Fill out the [PR template](.github/pull_request_template.md) completely.

4. Link any related issues using GitHub keywords (`Closes #123`, `Fixes #456`).

### PR Title

PR titles follow the same Conventional Commits format as commit messages:

```
feat(web): add conversation export
fix(api): handle WebSocket reconnection edge case
docs: add contributing guidelines
```

### Review Process

1. A maintainer will review your PR within a few days.
2. Address any requested changes by pushing new commits to your branch.
3. Once approved, a maintainer will merge the PR.
4. PRs are **squash-merged** into `main` to keep a clean history.

### What Reviewers Look For

- **Correctness** — does the code do what it claims?
- **Code style** — does it match the existing codebase?
- **Edge cases** — are error paths handled?
- **Performance** — are there any unnecessary re-renders or blocking calls?
- **Types** — is TypeScript used correctly with no `any` abuse?
- **Documentation** — are public APIs and non-obvious logic documented?

---

## Testing Requirements

> **Note:** This project does not yet have an automated test suite. Testing is currently done manually. Contributions to add tests are highly welcome.

### Manual Testing Checklist

Before submitting a PR, verify the following:

#### Core Functionality
- [ ] App loads without console errors
- [ ] Can create a new conversation
- [ ] Can send a message and receive a streaming response
- [ ] Can stop a response mid-stream
- [ ] Messages persist after page refresh
- [ ] Can switch between conversations
- [ ] Can rename and delete conversations
- [ ] Model selector works (`deepseek-chat` / `deepseek-reasoner`)

#### Connection Resilience
- [ ] Reconnecting after network drop shows status indicator
- [ ] History syncs correctly after reconnection
- [ ] Heartbeat keeps idle connections alive

#### UI/UX
- [ ] Mobile responsive layout works
- [ ] Sidebar opens/closes correctly on small screens
- [ ] Markdown renders correctly (headers, lists, code blocks, tables)
- [ ] Code block copy button works
- [ ] Welcome screen shows when no conversations exist
- [ ] Keyboard shortcuts work (`Ctrl/Cmd+N` for new chat)

#### Edge Cases
- [ ] Empty messages cannot be sent
- [ ] Rapid conversation switching doesn't corrupt state
- [ ] Long messages don't break the layout
- [ ] Special characters in messages are handled correctly

### Future: Automated Testing

Contributions to add automated testing are welcome. Recommended stack:

- **Unit tests:** [Vitest](https://vitest.dev/) for hooks, utilities, and shared types
- **Component tests:** [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
- **Integration tests:** [Miniflare](https://miniflare.dev/) for Durable Object logic
- **E2E tests:** [Playwright](https://playwright.dev/) for full user flows

---

## Code Style

### TypeScript

- **Strict mode** is enabled — no `any` types unless absolutely necessary
- Use explicit return types on exported functions
- Prefer `interface` over `type` for object shapes
- Use discriminated unions for variant types (see `WSServerMessage`)

### Naming Conventions

| Kind | Convention | Example |
|------|------------|---------|
| Variables/functions | camelCase | `sendMessage`, `isLoading` |
| Components | PascalCase | `ChatArea`, `MessageBubble` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `HEARTBEAT_INTERVAL` |
| Files (components) | PascalCase | `ChatInput.tsx`, `Sidebar.tsx` |
| Files (utilities) | camelCase | `api.ts`, `storage.ts` |
| Files (hooks) | camelCase with `use` prefix | `useChat.ts`, `useConversations.ts` |

### React

- Functional components only — no class components
- Use hooks for state and side effects
- Keep components small and focused (under 200 lines)
- Extract reusable logic into custom hooks
- Memoize expensive computations with `useMemo` and `useCallback`

### CSS

- Use Tailwind CSS utility classes
- Use the custom theme tokens (`surface-0`, `accent`, etc.) — don't hardcode colors
- Mobile-first responsive design (`sm:`, `md:`, `lg:` breakpoints)

### Imports

```typescript
// 1. External libraries
import { useState, useCallback } from 'react'
import { Send, Square } from 'lucide-react'

// 2. Shared types
import type { ChatMessage, WSClientMessage } from '@deep-chat/shared'

// 3. Internal modules (absolute paths)
import { ChatSocket } from '@/lib/api'
import { MessageBubble } from '@/components/MessageBubble'
```

---

## Reporting Issues

### Bug Reports

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:

- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Console errors (if any)
- Screenshots (if applicable)

### Feature Requests

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md). Include:

- Clear description of the feature
- Use case / motivation
- Proposed solution (if you have one)
- Alternatives considered

### Security Issues

For security vulnerabilities, please **do not** open a public issue. Instead, email the maintainers directly or use GitHub's private vulnerability reporting.

---

## Questions?

Open a [Discussion](https://github.com/LemonStudio-hub/deep-chat/discussions) if you have questions that aren't covered here.

Thank you for contributing! 🎉
