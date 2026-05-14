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
- Visitor reads `public_closet_inventory` view (template/edition/serial only); `unique_token` and acquisition timestamps remain owner-only.

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
- `closets` — closet layout per user
- `loot_boxes` — box definitions + drop tables
- `box_opens` — every box opening, with commit-reveal transcript
- `box_open_commits` — pre-input commit row, referenced by `box_opens.commit_id`.
- `audit_log` — generic append-only system events

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
