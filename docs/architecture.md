# Architecture

## Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | Next.js 15 + React + TypeScript | Type-safe, deploys to Vercel, edge-runtime support |
| **3D / avatar** | Three.js (WebGPU path) + R3F | WebGPU is production-ready; right abstraction for closet/social, not skating |
| **Realtime** | Colyseus (Node.js) on Railway/Fly | Schema-typed rooms, delta compression, presence, scales horizontally via Redis |
| **State of record** | Supabase Postgres | ACID transactions critical for trades; RLS, Realtime, Edge Functions, Storage in one |
| **Game logic** | Supabase Edge Functions (Deno) | Co-located with DB; `open_box`, `propose_trade`, `mint_shop_item` run server-authoritative |
| **Payments** | Stripe | Hubba Coin top-ups; one-time, no subscription at MVP |
| **CDN / static** | Vercel | Frontend assets, edge cache |
| **Asset storage** | Supabase Storage (S3-compatible) | Avatar meshes, item textures, closet props |

## Estimated infra cost

| MAU | Concurrent | Monthly |
|---|---|---|
| 1K | ~100 | ~$50 |
| 10K | ~1,000 | ~$250 |
| 100K | ~10,000 | ~$1.4–1.6K + 1 ops person |

## Topology

```
            ┌──────────────────┐
            │   Next.js (web)  │  Vercel
            └─────┬──────────┬─┘
                  │WebSocket │HTTPS
                  ▼          ▼
            ┌──────────┐ ┌──────────────────────────┐
            │ Colyseus │ │ Supabase                  │
            │ (rooms)  │ │  Postgres                 │
            │ Railway  │ │  Edge Functions (Deno)    │
            └────┬─────┘ │  Storage (assets)         │
                 │       │  Auth                     │
                 │       │  Realtime (LISTEN/NOTIFY) │
                 └──────▶└──────────────────────────┘
                          (server-authoritative txns)
                                   │
                                   ▼
                          ┌──────────────┐
                          │   Stripe     │
                          │ coin top-ups │
                          └──────────────┘
```

## The trade flow (critical path)

```
1. A proposes trade in closet
     │
     ▼
2. Colyseus broadcasts proposal to B
     │
     ▼
3. B accepts in UI
     │
     ▼
4. Edge Function `propose_trade(a_item_id, b_item_id, a_user, b_user)`:
     BEGIN TRANSACTION (SERIALIZABLE);
       - row-lock both inventory rows
       - assert neither item is in another pending trade
       - assert neither item is within its 7-day post-acquisition hold
       - INSERT trade_ledger (status='pending', id=nextval('trade_seq'))
       - UPDATE both inventory.owner_id atomically
     COMMIT;
     │
     ▼
5. Both clients confirm via Colyseus → status='confirmed'
     │
     ▼
6. Post-trade: set inventory.tradeable_after = NOW() + interval '7 days' on both rows
```

**Rollback path:** If either side disconnects within 30s without confirming, the trade flips to `status='aborted'` and the inventory updates are reversed (or, equivalently, the txn was never committed — TBD on whether confirm happens inside or outside the txn).

**Anti-fraud:**
- All failed trade attempts logged → velocity anomaly detection
- Value-mismatch warning UI ("you're trading a Mythic for a Common — confirm")
- Off-band email confirm for high-value trades
- 2FA required for trades above value threshold

## The loot box flow (provably fair)

```
1. Player clicks "Open" (paying Hubba Coins via wallet debit in same txn)
     │
     ▼
2. Server generates server_seed (32 bytes random)
   Server INSERTs `box_open_commits` row with `server_seed_hash`;
   returns `commit_id` to client.
     │
     ▼
3. Client posts `commit_id` + `client_seed` + `nonce`.
     │
     ▼
4. Server computes:
     combined = SHA256(server_seed || client_seed || nonce)
     outcome_index = bigint(combined) % 10_000
     item = drop_table.lookup(outcome_index)
     │
     ▼
5. If item is numbered (limited):
     UPDATE item_editions SET next_serial = next_serial + 1
       WHERE id = ? AND next_serial <= total_supply
       RETURNING next_serial - 1 AS minted_serial;
     INSERT inventory (owner, template, serial, unique_token=SHA256(...))
     │
     ▼
6. Server UPDATEs `box_opens` row setting `server_seed` and `revealed_at`.
     │
     ▼
7. Anyone can verify:
     SHA256(server_seed) == published_hash ?
     SHA256(server_seed || client_seed || nonce) % 10_000 == outcome_index ?
```

`server_seed`, `server_seed_hash`, and `client_seed` are 32-byte values
enforced at the DB layer via CHECK constraints (see
`0005_constraint_hardening.sql`); `server_seed` is nullable until reveal.

## Serial number uniqueness

Two-belt approach (DB constraint + cryptographic token):

```sql
-- belt 1: atomic counter inside the same txn as the mint
UPDATE item_editions
   SET next_serial = next_serial + 1
 WHERE id = ?
   AND next_serial <= total_supply
   AND retired_at IS NULL
RETURNING next_serial - 1 AS minted_serial;

-- belt 2: UNIQUE constraint on (item_edition_id, serial_number)
INSERT INTO inventory (owner_id, item_template_id, item_edition_id, serial_number, unique_token, source)
VALUES (?, ?, ?, ?, sha256(? || ? || now() || server_secret), 'loot_drop');
```

`unique_token` is verifiable forever — recompute and compare. Phase 3+ option: mint an on-chain attestation on Polygon for public verification. Not at MVP.

## Closet visit pattern

A Colyseus room **per closet**. Room state schema:

```
{
  closet_owner: user_id,
  inventory_items: [{ inventory_id, template, serial, rarity, equipped, displayed_at }],
  closet_layout: { theme, shelf_arrangement, deck_wall_slots },
  visitors: [user_id],
}
```

- Owner online → mutations broadcast in <100ms (equip change, decoration move).
- Owner offline → snapshot served from Postgres, room runs in read-only "ghost" mode.
- Async fallback: `GET /api/closets/:username/snapshot.json` for SEO + share previews (CDN-cached).
- Visitor reads `public_closet_inventory` view (template/edition/serial only, filtered by `closets.is_public`); `unique_token` and acquisition timestamps remain owner-only.
- Reactions on a closet (`closet_reactions` table) are subject to a DB-level per-UTC-day uniqueness floor: `closet_reactions_one_per_visitor_target_kind_per_day` (added in `0005_constraint_hardening.sql`). This is the *idempotency* invariant — one of each `kind` per `(visitor, target)` per UTC day. The future reaction Edge Function catches `unique_violation` (SQLSTATE 23505) and returns a friendly "you already reacted today" message. This composes with — but is distinct from — the per-user 50 HC/day *reward saturation* cap defined in [`docs/economy.md`](economy.md); the DB enforces the floor, the Edge Function enforces the ceiling.

## Database schema overview

See [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) for the full DDL.

Tables (Phase 0–2 scope):
- `users` — identity (Supabase Auth backed)
- `wallets` — Hubba Coin balance (one row per user)
- `coin_ledger` — append-only Hubba Coin transaction history
- `item_templates` — catalog (one row per item type: "Polestar Deck S1 — Camo")
- `item_editions` — limited-edition runs of a template ("Polestar Deck S1 Camo, run of 500")
- `inventory` — owned items (one row per physical copy of an item)
- `trade_ledger` — append-only trade history (every trade attempt logged)
- `trade_ledger_pending_items` — internal projection enforcing single-pending-trade-per-inventory invariant; written only by trigger, never by application code.
- `closets` — closet layout per user
- `loot_boxes` — box definitions + drop tables
- `box_opens` — every box opening, with commit-reveal transcript
- `box_open_commits` — pre-input commit row, referenced by `box_opens.commit_id`.
- `audit_log` — generic append-only system events

## Auth flow (Phase 1.5 + 1.6)

Email + password only at MVP. Supabase Auth is the system of record; the
`users` row is provisioned by the `handle_new_user` trigger from
`auth.users` (see `0002_audit_fixes.sql`, with defense-in-depth lowercase
normalization on the username metadata from `0006_handle_new_user_lowercase.sql`).

Surface map: `/auth/sign-up`, `/auth/sign-in`, `/auth/sign-out` (server
action), `/auth/check-email`, `/auth/callback`, `/auth/forgot-password`,
`/auth/forgot-password/sent`, `/auth/reset-password`, `/account`,
`/closet/me`, `/closet/<handle>`. Middleware gates `/closet/me` and
`/account` for anon viewers (redirecting to `/auth/sign-in?next=<path>`)
and bounces signed-in viewers off `/auth/sign-in` and `/auth/sign-up`.

```
 ┌────────────┐  POST /auth/sign-up    ┌──────────────────┐
 │  Browser   │ ─────────────────────▶ │ Server Action    │
 │ SignUpForm │   email, pwd, handle   │ signUpAction()   │
 └────────────┘                        └────────┬─────────┘
        ▲                                       │
        │  redirect /auth/check-email           │ supabase.auth.signUp
        │                                       ▼
        │                              ┌──────────────────┐
        │                              │ Supabase Auth    │
        │                              │  inserts         │
        │                              │  auth.users row  │
        │                              └────────┬─────────┘
        │                                       │ AFTER INSERT trigger
        │                                       ▼
        │                              ┌──────────────────┐
        │                              │ handle_new_user  │
        │                              │  users + wallet  │
        │                              │  + closet + 500HC│
        │                              └──────────────────┘
        │
        │  email confirm link
        ▼
 ┌────────────┐  GET /auth/callback?code  ┌──────────────────┐
 │  Browser   │ ─────────────────────────▶│ Route Handler    │
 └────────────┘                           │ exchangeCodeFor- │
        ▲                                 │ Session          │
        │  redirect /closet/me            └────────┬─────────┘
        │                                          │
        │   ┌──────────────────────────────────────┘
        │   │
        │   ▼
        │ ┌──────────────────┐
        │ │ /closet/me       │   getCurrentUser() → users.username
        │ │  server comp.    │   redirect /closet/<handle>
        │ └──────────────────┘
        ▼
 ┌────────────┐
 │ /closet/   │
 │  <handle>  │
 └────────────┘
```

Sign-in is the same shape minus the email confirm step: server action calls
`signInWithPassword`. The action honors a `?next=<path>` query param via a
hard-coded allowlist (`{/closet/me, /account}`) — anything else falls back
to `/closet/me`. This is what makes the middleware redirect chain work
end-to-end: anon viewer hits `/account`, middleware sends them to
`/auth/sign-in?next=/account`, they sign in, the action's `next` resolver
sends them back to `/account` (not `/closet/me`). The allowlist is hard-
coded as a `Set<string>` of literal strings — no regex, no protocol-relative
URLs, no `javascript:`. Sign-out is a single server action wired to a small
client `<UserMenu>` form. `middleware.ts` refreshes the session on every
request, gates `/closet/me` and `/account` for anon viewers, redirects
signed-in viewers away from `/auth/sign-in` and `/auth/sign-up`, and
exempts `/auth/reset-password` from the signed-in-bounce so a user mid-
reset can land on the page with a valid session.

Server components only ever call `supabase.auth.getUser()`, never
`getSession()` — only the former verifies the JWT against `auth.users`.

### Password reset flow (Phase 1.6)

```
 ┌────────────┐  POST /auth/forgot-password    ┌──────────────────┐
 │  Browser   │ ─────────────────────────────▶ │ Server Action    │
 │            │           email                │ forgotPasswordAction
 └────────────┘                                └────────┬─────────┘
        ▲                                               │
        │ redirect /auth/forgot-password/sent           │ resetPasswordForEmail
        │  (silent on unknown email — no enumeration)   │  redirectTo =
        │                                               │  /auth/callback
        │                                               │   ?next=/auth/reset-password
        │                                               ▼
        │                                      ┌──────────────────┐
        │                                      │ Supabase Auth    │
        │                                      │  emails the user │
        │                                      └────────┬─────────┘
        │                                               │ user clicks link
        ▼                                               ▼
 ┌────────────┐                              ┌──────────────────┐
 │ /auth/     │                              │ /auth/callback   │
 │ reset-     │ ◀──────────────────────────  │  exchangeCode    │
 │ password   │  redirect (next allowlist)   │  ForSession      │
 └─────┬──────┘                              └──────────────────┘
       │ POST  resetPasswordAction
       ▼
 ┌────────────┐
 │ supabase   │  updateUser({password})
 │ .auth      │  redirect /closet/me
 └────────────┘
```

`/auth/callback` honors a hard-coded `NEXT_ALLOWLIST = {/closet/me,
/auth/reset-password}`. Anything else falls back to `/closet/me`. This is
the only open-redirect surface in the auth flow, and the allowlist guards
it. The `/auth/reset-password` server component refuses to render without
an authenticated session — no session means the email link expired or was
already used, and the page redirects to `/auth/forgot-password?error=link_expired`.

### Username change + 30-day cooldown (Phase 1.6)

Settings live at `/account`. One section: "Username." Anon viewers are
redirected to sign-in (see the middleware notes above).

`users.username_changed_at` (nullable `timestamptz`, added in
`0005_constraint_hardening.sql`) tracks the most recent rename. The
`cooldownStatus()` pure helper in `lib/auth/server.ts` accepts that value
and returns `{ locked, nextEligibleAt }`. First change is free (NULL).
Subsequent changes are gated by `now() - username_changed_at > 30 days`.

The `changeUsernameAction` server action enforces this against a freshly-
read row (UI state is advisory; server is authoritative). The action also:
- Lowercases input before zod validation.
- Pre-flight collision check against `users.username` (anon-readable per
  the existing RLS `users_public_read` policy).
- UPDATEs `username` + `username_changed_at` in a single statement.
- Maps 23505 (UNIQUE violation race) to the same friendly "taken" error
  as the pre-flight collision case.

Username updates flow through the user-session Supabase client under
`users_self_update` RLS (`auth.uid() = id`), not through an Edge Function.
This is in-charter — `users` is identity, not money. The old `@handle`
becomes immediately claimable by another user (charter pillar: identity
is fluid, not collectible).

Username case: `users.username` is `citext` with a lowercase-only regex
CHECK (`^[a-z0-9_]{3,24}$`) and a belt-and-suspenders
`username::text = lower(username::text)` CHECK (see
`0005_constraint_hardening.sql`). The sign-up form normalizes user input
to lowercase before submit; the DB rejects anything that isn't already
lowercase, and citext makes uniqueness casefold-aware so `Foo` and `foo`
collide. On collision, `handle_new_user` retries once with a numeric
suffix before raising; the UI just renders `@<actualHandle>` without an
explanation.

## What we skip at MVP vs Phase 2

| Feature | MVP (Phase 1) | Phase 2 | Later |
|---|---|---|---|
| Avatar | 30 preset cosmetics, 3 base meshes | More presets, accessories | UGC editor |
| Trading | — | — | Phase 3 (own phase, scariest feature) |
| Loot boxes | Earned only, commit-reveal randomness | Paid boxes via Hubba Coins + compliance | On-chain attestation (optional) |
| Unique items | Serial numbers in DB, unique_token hash | Same + numbered shop drops | NFT mint (Polygon, optional) |
| Presence | Local closet only | Live closet visits with Colyseus | Hub room, friends list |
| Fraud detection | Manual flag, rate limits | Rules engine | ML anomaly detection |
| Mobile | Responsive web | PWA install | Native (Capacitor) |

## Operating principles

1. **Server-authoritative everything that touches inventory, currency, or trades.** Client UI is a view, never a source of truth.
2. **Append-only ledgers for currency and trades.** Postgres rows are not deleted, only superseded.
3. **Public auditability is a feature, not a leak.** Drop rates, trade history, and box-open transcripts are queryable.
4. **No agent ships to `main`.** Feature branch → PR → reviewer-agent pass → merge.
5. **The Architect designs before the Implementer codes** for anything touching inventory, trades, or money.
