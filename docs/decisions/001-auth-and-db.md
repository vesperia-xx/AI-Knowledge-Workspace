# 001 — Database and authentication

Phase 1 delivered the database schema, the Drizzle client and a working
credentials login. This note records the decisions that are not obvious from
reading the code, and the constraints that forced them.

## Session strategy: JWT, not database sessions

**The constraint.** Auth.js refuses to start when every provider is `credentials`
and the session strategy is `database`:

> `UnsupportedStrategy: Signing in with credentials only supported if JWT strategy is enabled`

The reason is that the Credentials provider never calls `adapter.createUser` or
`adapter.createSession`; it only verifies a password and hands back a user
object. Database sessions would have nothing to store.

**The decision.** `session.strategy = "jwt"`, 30-day expiry, signed with
`AUTH_SECRET` and stored in an `HttpOnly`, `SameSite=Lax` cookie.

**The consequence that matters.** A JWT cannot be revoked before it expires. If
a user is deleted, the token stays cryptographically valid. Deleting the row
alone would not log them out.

**The mitigation.** The token carries exactly one claim that matters: `sub`, the
user id. Every server render goes through `getCurrentUser()` in
`src/server/auth/session.ts`, which loads the user from Postgres by id. A deleted
user is rejected on the next request, and Phase 2 gets correct behaviour for
free: a role or organization change applies immediately instead of waiting for
the token to expire.

This is also why the JWT does **not** carry the email, the role or the
organization id. Anything cached in a long-lived token becomes stale.

**Rejected alternative.** Implementing sign-in manually (insert a `sessions` row,
set an encrypted cookie) to keep database sessions. It is ~80 lines of security
code to own, and Auth.js already handles CSRF, cookie chunking, expiry and
rotation. Revisit if "sign out of all devices" or an active-sessions screen
becomes a product requirement.

## Tables

Four tables, all owned by the schema and all created by one migration:

| Table | Used in Phase 1 | Purpose |
| --- | --- | --- |
| `users` | Yes | Account, plus `password_hash` for credentials |
| `accounts` | No | OAuth providers; one row per linked provider |
| `sessions` | No | Only used if the strategy becomes `database` |
| `verification_tokens` | No | Magic-link / email verification |

The three unused tables exist now because they are the canonical Auth.js shape
and they are needed by the Drizzle adapter the moment a second provider is
added. Three empty tables are cheaper than three more migrations later.

**`users.password_hash` is nullable.** An account created through OAuth has no
password. A nullable column expresses that better than a sentinel value, and the
credential check treats `NULL` as "cannot sign in with a password".

**One exception to camelCase.** The Drizzle adapter reads OAuth token columns by
their property name (`refresh_token`, `access_token`, …). Renaming them to
camelCase breaks at runtime, not just in the types, so those six columns keep
Auth.js' names. The Postgres column names are snake_case either way.

## Password handling

- **bcrypt, cost 10.** Measured at ~460 ms per hash in pure JavaScript on this
  machine. Cost 12 would take ~4× longer and make login feel broken.
- **72-byte limit enforced in the schema.** bcrypt silently truncates input at 72
  bytes; silently accepting a longer password would mean users think a character
  is part of their password when it is not.
- **Timing equalisation.** Unknown emails are compared against a fixed dummy hash
  so a failed login takes the same time whether the account exists or not.
  Without it, response time is a user-enumeration oracle.
- **Registration is a two-step check.** The `SELECT` before the `INSERT` gives a
  clean error message; the unique index on `users.email` is the real guard, and
  the action maps SQLSTATE `23505` to the same message for the race.

**Pending:** Argon2id replaces bcrypt in Phase 9. bcrypt's 72-byte limit and its
lack of memory hardness are the reasons.

## Two layers of authorization

| Layer | File | Runs | Reads | Purpose |
| --- | --- | --- | --- | --- |
| Optimistic | `src/proxy.ts` | Every matched request | Signed cookie only | Fast redirects, no flash of protected UI |
| Authoritative | `src/server/auth/session.ts` | Server render / action | Postgres | The actual access decision |

The proxy **never** queries the database. It runs before rendering on every
matched route, so a query there would be paid for by static assets and
prefetches. It is a UX optimisation; deleting it would not expose data.

The matcher is deliberately narrow (`/dashboard`, `/login`, `/register`) instead
of "everything except `_next`". A negative matcher has to be maintained every
time a public route is added; a positive one fails closed.

**`authConfig` is split from `auth.ts`** so the proxy imports neither `pg` nor
`bcryptjs`. It only needs the secret and the callbacks that decode the JWT.

## Server actions

Forms use `useActionState` and a server action, so the only network endpoint is
the action itself: no hand-written API route, no client-side fetch, no duplicated
validation.

- **Validation runs on the server**, in `form-state.ts`, with the same Zod schema
  the tests use. The browser's `type="email"` is a hint, not a guarantee.
- **Redirects are thrown, not returned.** `signIn` signals success by throwing a
  redirect; only `AuthError` is caught, everything else is rethrown. Swallowing
  the redirect is the classic bug that leaves the form stuck after a valid login.
- **`callbackUrl` is sanitised** to a relative, same-origin path. Passing it
  through unchecked is an open redirect.
- **Success is a redirect, failure is state.** The action returns field errors for
  validation and a generic "Invalid email or password" for a rejected login:
  never "no such user", which would confirm which emails are registered.

## Database client

- One `Pool` per process, cached on `globalThis` outside production. In
  development Next.js re-evaluates modules on every edit; without the cache each
  edit opens a new pool until Postgres runs out of connections.
- `import "server-only"` at the top of `src/server/db/index.ts` turns an
  accidental import from a client component into a build error instead of a
  leaked connection string.

## Migrations

`drizzle-kit` reads `.env` but not `.env.local`, which Next.js reads. The
mismatch produces the classic "the app works, the migration targets another
database" bug. `drizzle.config.ts` calls `process.loadEnvFile(".env.local")`, so
both paths read one file and no variable is duplicated.

## Open items

- Login is not rate limited. Redis is available; throttling lands in Phase 9.
- No password reset and no email verification: both need an email provider.
- `pgvector` is installed in the image but the extension is not enabled yet.
- No OAuth provider. The adapter and the three tables are already in place.

## Interview questions worth being able to answer

1. Why can't Auth.js use database sessions with the Credentials provider?
2. A JWT is valid for 30 days. A user is deleted after 5 minutes. What happens,
   and where is that enforced?
3. Why does the proxy only read the cookie, and what would break if it queried
   the database?
4. What is the difference between `401` and `403`, and which one does a failed
   login return here?
5. Why compare against a dummy hash when the email does not exist?
6. Why is `callbackUrl` validated even though it comes from your own form?
7. Why cache the `pg` pool on `globalThis` only in development?
8. What does `React.cache` deduplicate, and what does it not?
