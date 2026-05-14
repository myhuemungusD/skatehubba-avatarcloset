# Economy

Single-currency model: **Hubba Coins (HC).** Earnable and purchasable. The only thing players spend.

This doc is the source of truth for: coin pricing, box pricing, drop tables, edition sizing, and the math behind expected time-to-rare. Phase 1 numbers are first-pass estimates and will be tuned by live ops once we have data.

## Coin pricing (Phase 2, when paid coin packs go live)

Stripe one-time top-ups. Stripe takes ~3% + $0.30. Apple/Google in-app would take 30% — we ship web-first to avoid that tax.

| Pack | Price (USD) | Hubba Coins | Bonus % | Effective $/HC |
|---|---|---|---|---|
| Starter | $4.99 | 500 | 0% | $0.00998 |
| Stack | $9.99 | 1,100 | 10% | $0.00908 |
| Roll | $19.99 | 2,400 | 20% | $0.00833 |
| Heavy | $49.99 | 6,500 | 30% | $0.00769 |
| Whale | $99.99 | 14,000 | 40% | $0.00714 |

Pricing tuned so 100 HC ≈ $1 USD at the starter tier and scales down with bigger packs (industry-standard tilt).

## Earning Hubba Coins (Phase 1+)

| Source | HC | Cap |
|---|---|---|
| Account signup bonus | 500 | one-time |
| Daily login | 25 | once/day |
| 7-day streak bonus | +100 | once/week |
| Complete daily quest | 50 | 3/day |
| First-time achievements | 100–500 | one-time per ach |
| Get a "fire" reaction on your closet | 5 | 50/day cap |

A consistent F2P player should earn ~150–250 HC/day. Enough to open ~1 standard box every 1–2 days.

## Item boxes

Three flavors at MVP.

| Box | Cost (HC) | Notes |
|---|---|---|
| **Daily Box** (earned) | 0 | One per day, free, drop table favors Common with rare upside |
| **Standard Box** | 200 | Same drop table as Daily, slightly better Rare odds |
| **Premium Box** | 800 | Better odds across the board; small chance at a numbered limited |
| **Seasonal Box** | 500 | Themed to the active season/drop; only available during event |

Every box is guaranteed to contain at least one Common item — no empty boxes. Pity timer: a Rare-or-better is guaranteed within 10 Standard/Premium opens.

### Drop tables (first-pass)

Rates are **published** at the box-purchase screen and on `/odds`. The CI check asserts these match `loot_box_drop_tables` rows in Postgres.

**Standard Box drop table:**

| Rarity | % | Approx HC equivalent |
|---|---|---|
| Common | 70% | 50 |
| Uncommon | 22% | 200 |
| Rare | 6% | 800 |
| Epic | 1.8% | 3,000 |
| Mythic (numbered) | 0.2% | 15,000+ |

Expected value per Standard Box: ~155 HC of items for a 200 HC spend → 22.5% house edge. This is in the same neighborhood as Hearthstone packs (~25%) and gentler than CS:GO cases (~60%+).

**Premium Box drop table:**

| Rarity | % | |
|---|---|---|
| Common | 40% | |
| Uncommon | 30% | |
| Rare | 20% | |
| Epic | 8% | |
| Mythic (numbered) | 2% | |

EV ~620 HC for 800 HC spend → 22.5% house edge (same — Premium isn't a worse deal, it's just denser).

## Edition sizing (the limited-run math)

A "limited" item is identified by `(item_template_id, item_edition_id)` and has a `total_supply`. Once `next_serial > total_supply`, the edition is **retired** (`retired_at` set). It is never reprinted. This is in the charter.

Edition sizes by tier (Phase 2 shop drops, all values revisitable):

| Item tier | Typical supply | Notes |
|---|---|---|
| House standard | unlimited | Hubba house brand basics — always in stock |
| Seasonal common | 5,000–10,000 | Mid-season cosmetics |
| Brand collab regular | 1,000–2,000 | Fictional-brand collab T-shirts, hoodies |
| Brand collab signature | 250–500 | Specific decks, signature shoes |
| Founder / event grail | 50–100 | Tournament prizes, OG-player exclusives |
| Mythic 1-of-1 | 1 | Tony-Hawk-tier when we get real licenses; not at MVP |

## Trade economy

Trading is **item-for-item only.** No HC enters a trade. Trade dynamics emerge from rarity scarcity, not coin liquidity. This is enforced at the engine — no Hubba-Coin-leg in a trade transaction.

A 7-day **post-acquisition hold** is set on every newly-acquired inventory row (`inventory.tradeable_after = NOW() + interval '7 days'`). The hold:
- Prevents fresh-account fraud (open box → trade out → vanish)
- Reduces dupe-bug blast radius (catchable in 7 days before items disperse)
- Slows market manipulation pumps

## Open questions for Phase 1 tuning

- Should daily login HC scale with streak length more aggressively? (Risk: alts farming dailies.)
- Should the Daily Box have any chance at a Mythic? (Probably yes, very low — keeps F2P hopeful.)
- What's the right shop-drop cadence? Weekly? Bi-weekly? Monthly grail?
- Should we publish edition sell-through pace? (Yes, per charter pillar #4.)

These tune once we have telemetry. Don't pre-optimize.
