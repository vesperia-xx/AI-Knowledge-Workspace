# Recall

Recall is a B2B AI knowledge workspace: teams upload internal documentation and
ask questions in natural language. Answers are grounded in the company's own
documents, cite their sources, and can trigger tools when a question turns into
an action.

This repository is also a learning project. Each phase is documented, reviewed
and explained in `docs/decisions/` so the architecture can be defended in a
technical interview.

## Status

Phase 9 — security hardening, plans, limits and tests. Complete.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Setup, database, authentication | Complete |
| 2 | Organizations, members, roles | Complete |
| 3 | Document upload and processing | Complete |
| 4 | RAG, embeddings, semantic search | Complete |
| 5 | AI assistant, streaming, history | Complete |
| 6 | Tool calling / agent | Complete |
| 7 | Dashboard and usage metrics | Complete |
| 8 | Plans, limits and simulated checkout | Complete |
| 9 | Security hardening, tests and optimization | Complete |
| 10 | Docker, CI/CD, deployment | Planned |

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- PostgreSQL + pgvector, accessed with Drizzle ORM
- Auth.js v5 with credentials and a JWT session cookie
- Google Gemini via the Vercel AI SDK
- BullMQ + Redis for background document processing (optional: inline on Vercel)
- Simulated checkout for plans and limits (no external payment provider)

## Requirements

- Node.js 24+
- Docker Desktop with the engine running
- npm 11+

## Getting started

```bash
# 1. Environment variables
cp .env.example .env.local
# fill AUTH_SECRET

# 2. Infrastructure (Postgres + pgvector, Redis)
docker compose up -d

# 3. Install dependencies
npm install

# 4. Apply database migrations
npm run db:migrate

# 5. Start the app
npm run dev
```

The app runs at http://localhost:3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emitting |
| `npm test` | Unit tests with Vitest |
| `npm run db:generate` | Generate a migration from the Drizzle schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database with Drizzle Studio |

## Project structure

```
src/
  app/                 Routes, layouts and route groups
    (app)/             Authenticated app: dashboard, onboarding, workspace
    (auth)/            Login, register and invitation acceptance
  components/          UI components (ui/ holds shadcn primitives)
  lib/                 Shared client-safe helpers (slugs, role labels)
  server/
    lib/               Errors, logger, shared server utilities
    auth/              Auth.js configuration, guards, policy, tenant resolution
    actions/           Server Actions: validate, authorize, call a service
    db/                Drizzle client, schema and migrations
    services/          Business logic, one module per domain
  env.ts               Runtime environment validation
docs/decisions/        Architecture decision notes, one per phase
```

The rule that keeps the codebase honest: **routes and components never talk to
the database directly**. They call services, and services are the only place
that knows about persistence. Workspaces are addressed by URL
(`/app/[orgSlug]/...`); a non-member gets a 404, not a 403.

## Deploying the demo (Vercel)

The app runs on Vercel with two managed services and no extra worker:

1. **Database**: Neon (or Supabase) Postgres with `create extension vector`.
   Set `DATABASE_URL` to the **pooled** connection string and run
   `npm run db:migrate` once against it.
2. **Redis**: Upstash (or any `rediss://` provider). Required by the env schema
   and used for rate limiting.
3. **Variables**: `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`,
   `OPENROUTER_API_KEY` and `AUTH_URL`. They must exist before the build, since
   `src/env.ts` validates them while collecting page data.

On Vercel, `DOCUMENT_PROCESSING` defaults to `inline`: the document is
processed after the upload response is sent, with no queue consumer. The
trade-off is the function timeout, so keep demo files small. Set
`DOCUMENT_PROCESSING=queue` and run `src/worker/` on a long-lived host
(Railway, Render, Fly) for production-sized documents.

Uploads are written to `/tmp` on Vercel by default. That is writable but
ephemeral: files disappear on cold starts and after a retry. For durable
storage, point `UPLOAD_DIR` at a mounted volume or swap
`src/server/storage/local.ts` for S3/R2.

