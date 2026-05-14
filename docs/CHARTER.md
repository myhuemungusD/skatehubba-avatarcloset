# Charter — SkateHubba: Avatar Closet

## Vision

> *"The Habbo of skate culture — where your closet is your identity and your trades are your stories."*

## Player promise

> *"Collect authentic-feeling skate gear. Show it off in a closet that's yours. Trade your way to the holy grails."*

## Core loops (priority order)

1. **Collect** — open item boxes, get a mix of common gear and the occasional rare numbered piece.
2. **Customize** — dress your avatar; arrange your closet space (shelves, walls, deck displays).
3. **Show off** — share your closet URL; let other players visit; receive "fire" reactions.
4. **Trade** — propose item-for-item swaps with other players in-closet.
5. **Hunt** — chase limited-run shop drops, seasonal collabs, and complete sets.

## Pillars (the rules we don't break)

1. **Authenticity over breadth.** A small library of items that feels real beats a huge library that feels fake.
2. **The closet is the feed.** Social discovery happens by walking through closets, not scrolling a list.
3. **Trading stays peer-to-peer, forever.** Habbo's 2020 mistake is our north star of what not to do.
4. **Drop rates are public.** Loot-box rates posted on day one. Regulatory and trust win.
5. **Scarcity is honored.** A numbered item never gets reprinted. Burn the master after the run.
6. **Closed-loop economy.** Items have no real-world monetary value. No item-for-cash trades between players. ToS states it explicitly.

## Non-goals

- Not a skate gameplay game. No tricks, no skating physics. Closet/social only.
- Not an NFT/crypto product. Optional Phase 3+ attestation; not the value prop.
- Not real-money item trading. Cash flows only through official shop/box purchases.
- Not a UGC platform at MVP. Curated drops only.

## Brand strategy

**Fictional brands at MVP.** Original skate-evoking labels (working names: *Thrashr*, *Polestar Decks*, *Suprmthing*, *Vanz*-style silhouettes, in-house *Hubba* house brand). No real-brand logos, colorways, or trade dress at launch. Real licenses layered in post-PMF, mid-tier indie brands first.

See [`brand-bible.md`](brand-bible.md) for the brand catalogue.

## Currency model

**Single currency: Hubba Coins.** Earnable through play AND purchasable with real money. Used for both item boxes and the Hubba Shop.

```
Real money $ ──[Stripe]──▶ Hubba Coins ──┬──▶ Item Box (random)  ──▶ Inventory
                              ▲          │
                              │          └──▶ Hubba Shop (deterministic, numbered) ──▶ Inventory
                              │
        Play / dailies / achievements ────┘     (Inventory items also flow P2P via Trade)
```

Three sinks: boxes, shop, closet decor. Two sources: real-money purchase, gameplay. Inventory items themselves are non-fungible — they move only via box drops, shop purchases, or P2P trades. **No item ↔ coin conversion.**

## The Hubba Shop is a place, not a menu

A 3D skate-shop interior the player walks into — deck wall, shoe wall, T-shirt rack, register counter, shop NPC. Limited drops appear on the shelves with serial numbers visible. New seasons restock the shop.

## Forward integration

This product folds into the broader SkateHubba experience later. Auth, wallet, inventory, and identity are designed as **cleanly separable services with stable APIs** so future federation doesn't require a rewrite. Don't build the federation now — just don't preclude it.

## Compliance baseline (codified)

1. **Drop rates public from day one.** `/odds` page + CI check that published rates match DB drop tables.
2. **ESRB + PEGI "Includes Random Items"** label at launch.
3. **Belgium + Netherlands** geo-block on Hubba Coin *purchases* (free play and earned-coin opens remain available).
4. **Age-gate** Hubba Coin purchases (parental consent for <18).
5. **Spend caps** (configurable daily/monthly limits per user).
6. **No published secondary-market prices in-game.** Lesson from CS:GO skin gambling regulation.
7. **Pity timer + every box gives at least a Common.** Softens random-outcome regulatory profile and players love it.
8. **Trademark/gaming-regulatory lawyer retained before public launch.** Project line item, not optional.

## Risk register (top 3 we manage actively)

1. **Trade dupe bug.** Mitigation: SERIALIZABLE Postgres transactions, append-only `trade_ledger`, QA dupe-harness mandatory pre-merge for any change to `inventory` or `trade_ledger`, bug bounty post-launch.
2. **IP / brand-replica takedown.** Mitigation: fictional brands at MVP, brand bible reviewed by counsel pre-launch.
3. **Economy inflation** (Roblox UGC pattern). Mitigation: curated supply, hard caps per edition, retire `next_serial` after run, no-reprints rule in the charter.

Full risk register in the planning doc.
