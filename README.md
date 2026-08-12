# AI Invention — Command OS

Self-hosted control dashboard for AI Invention's agents, project pipeline, and site health.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- SQLite via Node's built-in `node:sqlite` (single-file, zero external deps, no native build step)
- Tailwind CSS 4 (dark theme)
- Zustand for client state

## Development

```bash
pnpm install
pnpm dev
```

First run redirects to `/setup` to create the admin account, then `/login`.

## Build

```bash
pnpm build
pnpm start
```

## Environment

- `AUTH_PASS` (optional) — set to bypass `/setup` and use a fixed admin password.
