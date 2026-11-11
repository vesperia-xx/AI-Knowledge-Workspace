# 002 — Organizations, members and roles

Phase 2 answers one question: **who may read or change what, and how does the
code know it on every request?** Everything else in the product (documents,
chats, usage) is scoped by the answer.

## The tenant is the URL, not a cookie

A workspace lives at `/app/[orgSlug]/...`. The slug is untrusted input; it is
joined against `memberships` for the signed-in user:

```sql
select o.id, o.name, o.slug, m.role
from memberships m
join organizations o on o.id = m.organization_id
where o.slug = $1 and m.user_id = $2
```

No row means 404. There is no separate "is this slug allowed" check that a new
page could forget, and no hidden state deciding which tenant a request belongs
to.

**Why not a cookie with the "active organization"?**

- A cookie adds a second source of truth next to the URL. A copied link can
  point at workspace A while the cookie says B.
- Switching workspaces becomes a mutation, so it needs CSRF protection and
  cache invalidation.
- Serving the same URL differently per user breaks bookmarks and logs.

The cost is visible: multi-workspace users carry the slug in links. That is
cheap next to an ambiguity about which data a query is allowed to see. Phase 3
keeps this rule: every service that touches tenant data takes an
`organizationId` that came from `requireOrganization()`.

## Roles: an enum plus a permission matrix

Roles are a Postgres enum (`owner`, `admin`, `member`) and permissions are a
literal table in `src/server/auth/authorization.ts`:

| Permission | owner | admin | member |
| --- | --- | --- | --- |
| `org:update` | ✅ | ✅ | |
| `member:invite` | ✅ | ✅ | |
| `member:remove` | ✅ | ✅ | |
| `member:role:change` | ✅ | | |
| `billing:manage` | ✅ | | |

`role === "owner" || role === "admin"` is shorter, but it encodes an ordering.
The day a role is inserted between them, every `||` has to be re-audited. A
table can be read and corrected in one screen. A full policy library (CASL,
Oso) is not justified for five permissions.

UI checks call `can()` to hide impossible actions; services call `assertCan()`
so a request that skips the UI still fails. **Only the service check is
authorization**; the UI check is a courtesy.

## Schema decisions

- **`memberships` has a composite primary key `(organization_id, user_id)`.**
  "One role per user per workspace" becomes a database invariant instead of a
  convention, and the index covers "members of a workspace".
- A second index on `user_id` covers the other direction, used at sign-in.
- **Roles live only in `memberships`.** `users` has no global role; a person can
  be owner in one workspace and member in another. Phase 8 (billing) will add
  whoever pays, which is a workspace attribute, not a user one.
- Deleting a workspace cascades to memberships and invitations. Deleting a user
  cascades to memberships; `created_by` / `invited_by` become `NULL`, because an
  audit trail should not disappear with an account.

## Invitations

No email provider exists yet, so an invitation is a **link shared manually**.

- 32 random bytes from `crypto.randomBytes`, base64url, stored in the URL. It is
  not derived from ids or timestamps.
- Single use: `accepted_at` is set inside the same transaction that creates the
  membership.
- Seven-day expiry.
- Re-inviting the same email reuses the pending row **and rotates the token**, so
  a previously shared link stops working.
- A partial unique index `(organization_id, email) WHERE accepted_at IS NULL`
  guarantees at most one pending invite per address, while keeping accepted
  rows for audit.
- The invite is bound to an email. Accepting with a different account returns
  `wrong_account`; otherwise a forwarded link would grant access to whoever
  holds it.
- **Ownership is never granted by link.** Invites offer `admin` or `member`;
  ownership is changed from the members list by an existing owner, after the
  person is identified.
- Accepting an invitation is idempotent at the database level
  (`onConflictDoNothing`), so two tabs cannot produce two memberships.

The acceptance page (`/invite/[token]`) is public and decides everything on the
server: not found → already used → expired → anonymous (sign in / register with
`callbackUrl`) → wrong account (sign out) → valid (accept). The invited email is
only shown to the signed-in account it belongs to; an anonymous visitor holding
a forwarded link learns the workspace name and role, nothing else.

## The last-owner invariant

A workspace with zero owners is unreachable: nobody can promote anyone. The
service therefore refuses to demote or remove the last owner.

The naive version — count owners, then update — is a **check-then-act race**:
two owners demoting each other at the same time both read "2 owners" and both
succeed. `changeMemberRole` / `removeMember` run in a transaction and take
`SELECT ... FOR UPDATE` on every owner row before counting, which serialises the
two requests. The loser re-reads the real state and gets a conflict.

This was verified with a temporary concurrency test: two simultaneous
demotions, exactly one succeeds, exactly one owner remains.

## Layering

| Layer | File | Job |
| --- | --- | --- |
| Schema | `src/server/db/schema/organizations.ts` | Tables, enum, indexes |
| Tenant resolution | `src/server/auth/organization.ts` | Slug + membership → context, 404 otherwise |
| Policy | `src/server/auth/authorization.ts` | Matrix, `can()`, `assertCan()` |
| Services | `src/server/services/{organizations,memberships,invitations}.ts` | Rules, transactions, queries |
| Actions | `src/server/actions/{auth,organizations,members,invitations}.ts` | Validate input, resolve tenant, call a service, revalidate |

Actions never contain SQL, and services never read cookies or `params`. That is
what makes the temporary database tests possible without a browser.

## Errors

A non-member gets **404**, not 403. "You are not allowed" confirms that the
workspace exists; 404 makes workspaces indistinguishable from ones that do not.
Expected domain failures (`ConflictError`, `ForbiddenError`, `NotFoundError`)
become form messages; anything else is a bug and is rethrown.

## Verification (phase close)

- `lint`, `typecheck`, `test` (21 tests) and `build` pass.
- Temporary integration tests against real Postgres covered: org creation with
  slug retry, duplicate slug, invite lifecycle (rotation, wrong account,
  accept, double accept), revoke, expiry, role change permission, last-owner
  guard under concurrency, member leaving, tenant isolation.
- Runtime checks with `next dev`: anonymous redirects for `/dashboard`,
  `/onboarding` and `/app/*`; invite states (not found / expired / already
  used / anonymous / wrong account / valid); accept through the rendered form
  (303 to `/app/verify-phase2`); role change through the rendered form; 404 for
  a workspace the user does not belong to; signed-in users bounced off
  `/login`. Test data was deleted afterwards.

## Known limits

- **Invitation tokens are stored in plaintext.** A leaked database read gives
  working links. Hashing them (like password-reset tokens) is the Phase 9 fix;
  link generation would return the raw token exactly once.
- **No rate limit on invitation creation**, and no email delivery. Both are
  Phase 9 / Phase 8 concerns.
- **A demoted owner keeps access until their request ends.** Session data is
  re-read from Postgres on every request, so the next request already sees the
  new role.
- Owners can remove themselves. This is intentional ("leave workspace") and is
  guarded by the same last-owner check; it redirects to `/dashboard`.
