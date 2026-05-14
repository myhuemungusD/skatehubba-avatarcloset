# SkateHubba: Avatar Closet

Virtual closet game with skater-culture identity. Dress an avatar, collect gear from item boxes, customize your closet, visit other players' closets, trade pieces peer-to-peer.

Forward-integrates into the broader SkateHubba product.

## Status

Phase 0 — foundation. Greenfield. No app code yet.

Working branch: `claude/skater-closet-game-ZATwX`.

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
  web/         Next.js app (avatar, closet, shop UI, trade UI)
  realtime/    Colyseus rooms (closet visits, presence, trade handshake)
packages/
  schema/      Shared TypeScript types + zod schemas
supabase/
  migrations/  SQL migrations (state of record)
  functions/   Edge Functions (open_box, propose_trade, mint_shop_item)
docs/          Charter, architecture, economy, brand bible, team rules
.claude/       Hooks + project rules for the agent crew
```

## Roadmap

- **Phase 0** (weeks 1–2): Foundation — repo, schema, docs, hooks.
- **Phase 1** (weeks 3–8): MVP closet — auth, avatar, inventory, item boxes (earned only), commit-reveal randomness.
- **Phase 2** (weeks 9–14): Social + shop — visit closets live, Hubba Coin purchases, numbered shop drops.
- **Phase 3** (weeks 15–22): Trading — P2P swaps with escrow, 7-day hold, dupe-bug stress harness.
- **Phase 4** (week 23+): Live ops, depth, growth.
