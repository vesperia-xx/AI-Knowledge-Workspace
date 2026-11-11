# 000 — Working agreement

This file is the entry point for anyone (human or agent) joining the project. It
records how the work is done, what has been decided, and what is deliberately
missing. It is updated when a rule changes, not every session.

## What we are building

**Recall** is a B2B AI knowledge workspace. A team uploads internal documents and
asks questions in natural language. Answers are grounded in retrieved passages,
cite their sources, respect tenant boundaries, and can trigger tools when a
question turns into an action.

It is also a learning project: every phase is small, reviewed, and explained well
enough to be defended in a technical interview. Code that cannot be explained is
removed, not kept.

## How we work

1. **One phase at a time.** A phase starts only when the previous one is closed
   and verified. Never start the next phase without an explicit request.
2. **Explain before changing important code.** Say what will be built and why
   before touching the core of the app.
3. **Flag anything unfamiliar.** New concepts, non-obvious APIs and Next.js
   conventions get an explanation, not just working code.
4. **No cargo cult.** Prefer clear, boring code. No abstraction until the second
   real use case exists.
5. **No unnecessary technology.** Every dependency must justify itself against
   the alternative of writing ~30 lines. When there are options, present the
   trade-off and recommend one.
6. **The user writes the conceptual core.** Selected files are delegated on
   purpose (currently: `src/env.ts` and `docker-compose.yml` were written by the
   user). The assistant reviews them line by line instead of rewriting them.
7. **Point out flaws before changing direction.** If the user's approach has a
   problem, say it first, with the reason, then propose the fix.
8. **Verify, do not assume.** A phase is only done when `lint`, `typecheck`,
   `test` and `build` pass, and the runtime behaviour was actually exercised.
9. **UI copy and code identifiers in English.** Chat explanations in Spanish,
   durable documentation in English.
10. **Status lives in files, not in the chat.** `README.md` for what the project
    is and where it stands; `docs/decisions/` for the why; `AGENTS.md` for the
    working rules. A session summary is disposable; these are not.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | Server Components + Server Actions keep data access off the client without a separate API layer |
| Language | TypeScript, strict | Types are the cheapest form of documentation |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI preset) | Owned components, no runtime CSS-in-JS |
| Database | PostgreSQL 17 + pgvector | One store for relational data and embeddings |
| ORM | Drizzle ORM + `pg` | SQL-shaped, typed, no hidden query engine |
| Auth | Auth.js v5 (`next-auth@5 beta`) | Database-backed user records, JWT session cookie |
| Validation | Zod 4 | One schema for forms, server actions and env |
| AI | OpenRouter (compatible con Vercel AI SDK) | Embeddings + generation behind one interface |
| Queue | BullMQ + Redis | Document ingestion must not block a request |
| Tests | Vitest | Fast, no config ceremony |

### Next.js 16 conventions in use

- `proxy.ts` replaces `middleware.ts` and runs on the Node.js runtime by default.
- `cookies()`, `headers()` and route `params` are async.
- `next lint` no longer exists; ESLint is called directly.
- `cacheComponents` and `partialPrefetching` are **disabled**: they impose a
  caching model that does not pay off for a per-user dashboard.

## Deliberate cuts

These are scope decisions, not forgotten features. Each one names what replaces
it today and when it should be revisited.

| Cut | Today | Revisit |
| --- | --- | --- |
| Local disk storage behind a thin adapter | Files land in `/uploads` (git-ignored) | Phase 10, swap for S3/R2 |
| Vector-only retrieval | `pgvector` similarity search only, no `tsvector` hybrid | Phase 9, if recall on exact terms is poor |
| No client data cache | Server Components + Server Actions, no TanStack Query | Only if the UI needs aggressive client caching |
| Console logger | Structured JSON to stdout, no `pino` | Phase 10, when logs must be shipped |
| No OAuth | Credentials only | Phase 9 |
| No CI | Scripts run locally | Phase 10 |
| No email delivery | Invitation links are copied and shared manually | Phase 8, when plans and email enter the picture |

## Notation used in explanations

| Marker | Meaning |
| --- | --- |
| 🧠 | The concept behind the code: why it works this way |
| 🔧 | The part the user implements manually |
| ⚠️ | A real risk, trade-off or limitation worth remembering |
| 🎤 | A question likely to appear in a technical interview |

## Phase map

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Setup, database, authentication | Complete |
| 2 | Organizations, members, roles, invitations | Complete |
| 3 | Document upload and processing | Complete |
| 4 | RAG, embeddings, semantic search | Complete |
| 5 | AI assistant, streaming, conversation history | Complete |
| 6 | Tool calling / agent behaviour | Complete |
| 7 | Dashboard and usage metrics | Complete |
| 8 | Stripe, plans and limits | Planned |
| 9 | Security hardening and tests | Planned |
| 10 | Docker, CI/CD, deployment, docs | Planned |

## Known pending items

Tracked here so they are not rediscovered as "bugs" later.

- **`vector` extension is installed but not enabled.** `pgvector/pgvector:pg17`
  ships the extension; a migration must run `CREATE EXTENSION IF NOT EXISTS
  vector;` before Phase 4 adds an embedding column.
- **`drizzle-kit` does not read `.env.local`.** The app does. `drizzle.config.ts`
  loads `.env.local` explicitly with Node's built-in env loader so both see the
  same `DATABASE_URL`.
- **Credentials-only auth forces JWT sessions.** Auth.js refuses database
  sessions when every provider is `credentials`. See `001-auth-and-db.md`.
- **No rate limiting yet.** Redis is running, but login throttling lands with the
  security phase; until then the login endpoint is unthrottled.
- **`bcryptjs` is pure JavaScript.** Argon2id (native) is the Phase 9 upgrade.
- **Invitation tokens are stored in plaintext.** Hashing them (returning the raw
  token once, at creation) is the Phase 9 hardening item.
- **No rate limit on invitation creation.** Redis is available; throttling
  belongs with the Phase 9 security pass.
- **Compose volume is named `Postgres_data`.** Cosmetic inconsistency with
  `redis_data`; renaming later requires `docker compose down` first.
