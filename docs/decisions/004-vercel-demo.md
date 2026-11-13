# Phase 10: Vercel demo deployment

The portfolio demo runs on Vercel without a permanent worker or object storage.
Each compromise is explicit and reversible.

## Decisions

1. **Processing mode is configuration, not a fork.**
   `resolveProcessingMode` (`src/server/documents/processing-mode.ts`) picks
   `queue` locally and `inline` on Vercel. Inline reuses the exact pipeline the
   worker calls, scheduled with `after()` so the upload response is not blocked.
   `DOCUMENT_PROCESSING=queue|inline` overrides detection. BullMQ is imported
   lazily, so inline deployments never open a Redis queue connection.

2. **Uploads fall back to `/tmp` on Vercel.**
   The deployment filesystem is read-only; `/tmp` is the only writable path and
   is ephemeral. Files survive long enough for inline processing in the same
   invocation. A retry after a cold start cannot read the original bytes, which
   is acceptable for a demo. Durable storage means `UPLOAD_DIR` on a volume or
   swapping `src/server/storage/local.ts` for S3/R2.

3. **Function budget.**
   The upload and chat routes export `maxDuration = 60`, the Hobby ceiling.
   Large documents and long conversations can still hit it; that is the signal
   to move processing to the worker.

4. **Plans have no external provider.**
   The plan catalogue lives in `src/lib/plans.ts`, shared by the services that
   enforce quotas and the settings UI. Upgrades go through
   `/api/orgs/[orgSlug]/billing/simulate-upgrade`, restricted to owners/admins.

## Environment

Required before the first build, because `src/env.ts` runs during page data
collection: `DATABASE_URL` (pooled), `REDIS_URL` (`rediss://`), `AUTH_SECRET`,
`OPENROUTER_API_KEY`, `AUTH_URL`.

Optional: `UPLOAD_DIR`, `DOCUMENT_PROCESSING`.
