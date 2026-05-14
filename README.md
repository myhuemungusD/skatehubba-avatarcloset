# SkateHubba: Avatar Closet

Virtual closet game with skater-culture identity. Dress an avatar, collect gear from item boxes, customize your closet, visit other players' closets, trade pieces peer-to-peer.

Forward-integrates into the broader SkateHubba product.

## Status

Phase 1.5 — Auth + identity wiring on top of the Phase 1 scaffold. Next.js
web app with Supabase email-password auth, Colyseus realtime server, shared
schema package, CI typecheck + lint + unit tests + charter grep guards.

Working branch: `claude/skater-closet-game-ZATwX`.

## Getting started

Requirements: Node 20.11+, pnpm 9.12.3 (pinned via `packageManager`).

```sh
pnpm install
cp .env.example .env.local      # fill in NEXT_PUBLIC_SUPABASE_* + service role
pnpm -r typecheck                # static typecheck across the workspace
pnpm -r test --run               # vitest across packages
pnpm -F @skatehubba/web dev      # Next.js on http://localhost:3000
pnpm -F @skatehubba/realtime dev # Colyseus on REALTIME_PORT (default 2567)
```

### Supabase project setup

1. Create a Supabase project. Copy the **Project URL** into
   `NEXT_PUBLIC_SUPABASE_URL` and the **anon public** key into
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Keep the **service role**
   key out of the web app — it is reserved for Edge Functions and e2e admin
   helpers.
2. Run the SQL migrations in `supabase/migrations/` against your project, in
   numeric order. Use the Supabase SQL editor or `supabase db push`.
3. In **Authentication → URL Configuration**, set the Site URL to your dev
   host (e.g. `http://localhost:3000`) and add `${SITE_URL}/auth/callback`
   as a redirect URL. Email confirmation is **on** by default and the
   sign-up flow assumes it; users land on `/auth/check-email`, click the
   confirm link, and the `/auth/callback` route exchanges the code and
   redirects them to `/closet/me`.
4. New signups are provisioned via the `handle_new_user` SECURITY DEFINER
   trigger (migration `0002_audit_fixes.sql`). Each new auth user gets a
   `users` row, a `wallets` row, a `closets` row, and a 500 HC signup-bonus
   `coin_ledger` entry.

### End-to-end tests

Playwright runs against `@skatehubba/web`:

```sh
pnpm -F @skatehubba/web exec playwright install chromium
pnpm test:e2e
```

The auth golden-path spec (`apps/web/e2e/auth-golden-path.spec.ts`) is
skipped unless `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY` are
set; it admin-creates a confirmed user against a staging Supabase project
and exercises the sign-in flow end-to-end.

## Read first

- [`docs/CHARTER.md`](docs/CHARTER.md) — vision, pillars, non-goals
- [`docs/architecture.md`](docs/architecture.md) — stack, trade flow, loot-box flow, serial uniqueness
- [`docs/economy.md`](docs/economy.md) — Hubba Coins, drop tables, edition sizing
- [`docs/brand-bible.md`](docs/brand-bible.md) — fictional skater brands at MVP
- [`docs/team.md`](docs/team.md) — the agent crew and operating rules

## Stack

Next.js + Three.js (WebGPU) on the front. Colyseus for realtime closet rooms. Supabase (Postgres + Edge Functions + Storage) for state of record. Stripe for Hubba Coin top-ups.

## Layout

```
apps/
  web/         Next.js 15 app (App Router; landing, closet, sign-in stub, /api/health)
  realtime/    Colyseus rooms (closet visits, presence; trade handshake later)
packages/
  schema/      Shared TypeScript types + zod schemas (consumed via tsconfig paths)
supabase/
  migrations/  SQL migrations (state of record)
  functions/   Edge Functions (open_box, propose_trade, mint_shop_item — Phase 2+)
docs/          Charter, architecture, economy, brand bible, team rules
.claude/       Hooks + project rules for the agent crew
.github/       PR templates, CODEOWNERS, CI workflow
```

## Roadmap

- **Phase 0** (weeks 1–2): Foundation — repo, schema, docs, hooks.
- **Phase 1** (weeks 3–8): MVP closet — auth, avatar, inventory, item boxes (earned only), commit-reveal randomness.
- **Phase 2** (weeks 9–14): Social + shop — visit closets live, Hubba Coin purchases, numbered shop drops.
- **Phase 3** (weeks 15–22): Trading — P2P swaps with escrow, 7-day hold, dupe-bug stress harness.
- **Phase 4** (week 23+): Live ops, depth, growth.
