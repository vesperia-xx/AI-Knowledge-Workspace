<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Working rules

Read `docs/decisions/000-working-agreement.md` first. It holds the stack
decisions, the deliberate scope cuts and the phase map.

- One phase at a time. Do not start the next phase without an explicit request.
- Explain what will be built and why before changing important code.
- Flag unfamiliar concepts and Next.js 16 conventions instead of silently using
  them.
- No new dependency without a stated trade-off; recommend one option when there
  are several.
- The user writes selected pieces manually (conceptual core). Review those files
  line by line; do not rewrite them.
- Point out flaws in the current approach before changing direction.
- A phase is done only when `npm run lint`, `npm run typecheck`, `npm test` and
  `npm run build` pass and the runtime behaviour was exercised.
- UI copy and code identifiers in English; durable docs in English; explanations
  to the user in Spanish.
- Routes and components never talk to the database directly. They call services
  (or the DAL), and those are the only place that knows about persistence.
- Status belongs in `README.md` and `docs/decisions/`, never in a root
  `summary.md`.
